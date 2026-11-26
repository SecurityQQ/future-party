// Freeze the party: copy everything the app shows out of Supabase into the repo, so the database can be paused.
//   bun scripts/freeze.ts   (SUPABASE_SECRET_KEY, or else the Supabase CLI's login, gives it the key)
// Writes lib/frozen.json (every traveler, orbit, pass and session) and public/app/kin/ (each Kin's picture, and
// any clip that was kept in Supabase; the others stay on varg's CDN).
//
// The repo is public, so only what the app already shows goes in: no emails, no birthdays (each traveler's chart
// is worked out here instead), no image prompts or redraw notes, no guest-list rows. Pass codes and session tokens
// are kept as SHA-256 hashes: a pass or a signed-in phone still finds its traveler, and nobody can forge either.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chartFor, sunLongitude } from "../lib/astro";

const ROOT = join(import.meta.dir, "..");
const REF = "qxzihtpxkspkxwqpgsxa"; // the party's Supabase project
// `vercel env pull` writes "[SENSITIVE]" for sensitive values: the URL is then the party's project
const URL_ = (URL.canParse(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") ? process.env.NEXT_PUBLIC_SUPABASE_URL! : `https://${REF}.supabase.co`).replace(/\/$/, "");
const HOST = new URL(URL_).host;

// No key in the environment: ask the Supabase CLI, which logs in through the browser the first time.
function cliKey(): string {
  const node = `${process.env.HOME}/.nvm/versions/node/v22.19.0/bin`;
  const env = { ...process.env, PATH: `${node}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin` };
  const npx = existsSync(`${node}/npx`) ? `${node}/npx` : "npx";
  const cli = (...args: string[]) => Bun.spawnSync([npx, "--yes", "supabase@2", ...args], { env, stdin: "inherit", stderr: "inherit" });
  let r = cli("projects", "api-keys", "--project-ref", REF, "--reveal", "-o", "json");
  if (!r.success) r = cli("projects", "api-keys", "--project-ref", REF, "-o", "json"); // a CLI without --reveal
  if (!r.success) {
    console.error("\nThe Supabase CLI is not logged in: logging in now (a browser opens)…");
    cli("login");
    r = cli("projects", "api-keys", "--project-ref", REF, "-o", "json");
  }
  if (!r.success) throw new Error("No key: set SUPABASE_SECRET_KEY (Supabase dashboard → Project Settings → API Keys)");
  const keys = JSON.parse(r.stdout.toString()) as { name?: string; type?: string; api_key?: string }[];
  const whole = (k: { api_key?: string }) => /^(sb_secret_[\w-]+|eyJ[\w.-]+)$/.test(k.api_key ?? ""); // not a redacted one
  const key = keys.find((k) => k.type === "secret" && whole(k)) ?? keys.find((k) => k.name === "service_role" && whole(k));
  if (!key) throw new Error("The CLI showed no usable secret key: set SUPABASE_SECRET_KEY");
  return key.api_key!;
}
const given = process.env.SUPABASE_SECRET_KEY;
const KEY = given && !given.startsWith("[") && !/[^\x21-\x7e]/.test(given) ? given : cliKey();
const KIN = join(ROOT, "public", "app", "kin");

const headers: Record<string, string> = { apikey: KEY };
if (KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${KEY}`; // a legacy service_role JWT

async function rows<T = any>(table: string, select: string, order?: string): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const q = new URLSearchParams({ select, limit: "1000", offset: String(offset) });
    if (order) q.set("order", order);
    const res = await fetch(`${URL_}/rest/v1/${table}?${q}`, { headers });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as T[];
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

// "early", "middle" or "late" in the Sun sign, as Fable's prompt uses it (lib/fable.ts), without the degree.
function cusp(birthday: string): "early" | "middle" | "late" {
  const [y, m, d] = birthday.split("-").map(Number);
  const deg = sunLongitude(Date.UTC(y, m - 1, d, 12)) % 30;
  return deg < 8 ? "early" : deg > 22 ? "late" : "middle";
}

// A file from our Supabase Storage, copied into public/app/kin/; anything else (varg's CDN) stays where it is.
let bytes = 0;
async function keep(url: string | null, name: string): Promise<string | null> {
  if (!url) return null;
  const u = new URL(url);
  if (u.host !== HOST) return url;
  const ext = u.pathname.split(".").pop()!.toLowerCase();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  bytes += buf.length;
  await writeFile(join(KIN, `${name}.${ext}`), buf);
  return `/app/kin/${name}.${ext}`;
}

const [players, sessions, tags, collections, friends, scans] = await Promise.all([
  rows("players", "*", "card_no.asc"),
  rows<{ token: string; player_id: string }>("sessions", "token, player_id"),
  rows<{ code: string; player_id: string | null }>("tags", "code, player_id"),
  rows<{ collector_id: string; owner_id: string; created_at: string }>("collections", "collector_id, owner_id, created_at", "created_at.asc"),
  rows<{ player_id: string; friend_id: string; created_at: string }>("friends", "player_id, friend_id, created_at"),
  rows<{ player_id: string | null; kind: string }>("scans", "player_id, kind"),
]);

const no = new Map<string, number>(players.map((p) => [p.id, p.card_no]));
const scansOf = new Map<string, number>();
for (const s of scans) if (s.player_id && (s.kind === "collect" || s.kind === "repeat")) scansOf.set(s.player_id, (scansOf.get(s.player_id) ?? 0) + 1);

await mkdir(KIN, { recursive: true });
const frozenPlayers = [];
for (const p of players) {
  // A redraw that never finished leaves the first picture in prev_image_url
  const image = await keep(p.status === "done" ? p.image_url : p.prev_image_url, String(p.card_no));
  frozenPlayers.push({
    id: p.id,
    card_no: p.card_no,
    name: p.name,
    sign: p.sign,
    element: p.element,
    character: p.character,
    subject: p.subject,
    style: p.style,
    rarity: p.rarity,
    status: image ? "done" : "failed", // nothing is drawing any more
    image_url: image,
    video_url: p.status === "done" && image ? await keep(p.video_url, `${p.card_no}-clip`) : null,
    prophecy: p.prophecy,
    bio: p.bio,
    ask_me: p.ask_me,
    links: p.links ?? {},
    chart: chartFor(p.birthday, p.sign),
    cusp: cusp(p.birthday),
    scans: scansOf.get(p.id) ?? 0,
    created_at: p.created_at,
  });
}

// Old mutual "friends" pairs that nobody settled into orbit entries yet: the app would have made them
// collections both ways on the owner's next visit (settleLegacy in lib/orbit.ts), so they are made so here.
const pair = new Set(collections.map((c) => `${c.collector_id}>${c.owner_id}`));
const asked = new Map(friends.map((f) => [`${f.player_id}>${f.friend_id}`, f.created_at]));
let settled = 0, pending = 0;
for (const f of friends) {
  const back = asked.get(`${f.friend_id}>${f.player_id}`);
  if (!back) { pending++; continue; }
  if (pair.has(`${f.player_id}>${f.friend_id}`)) continue;
  collections.push({ collector_id: f.player_id, owner_id: f.friend_id, created_at: back > f.created_at ? back : f.created_at });
  pair.add(`${f.player_id}>${f.friend_id}`);
  settled++;
}
collections.sort((a, b) => a.created_at.localeCompare(b.created_at));

const snapshot = {
  frozen_at: new Date().toISOString(),
  scans: scans.length,
  players: frozenPlayers,
  // [collector card number, owner card number, when]
  orbits: collections.filter((c) => no.has(c.collector_id) && no.has(c.owner_id)).map((c) => [no.get(c.collector_id), no.get(c.owner_id), c.created_at]),
  // SHA-256 (first 32 hex) of a pass code -> card number; blank passes are left out
  passes: Object.fromEntries(tags.filter((t) => t.player_id && no.has(t.player_id)).map((t) => [hash(t.code), no.get(t.player_id!)])),
  // SHA-256 (first 32 hex) of a session cookie -> card number
  sessions: Object.fromEntries(sessions.filter((s) => no.has(s.player_id)).map((s) => [hash(s.token), no.get(s.player_id)])),
};

// One traveler per line, so a later fix reads as a small diff
const lines = (xs: unknown[]) => xs.map((x) => "  " + JSON.stringify(x)).join(",\n");
const json = `{
"frozen_at": ${JSON.stringify(snapshot.frozen_at)},
"scans": ${snapshot.scans},
"players": [
${lines(snapshot.players)}
],
"orbits": [
${lines(snapshot.orbits)}
],
"passes": ${JSON.stringify(snapshot.passes, null, 1)},
"sessions": ${JSON.stringify(snapshot.sessions, null, 1)}
}
`;
await writeFile(join(ROOT, "lib", "frozen.json"), json);

const clips = frozenPlayers.filter((p) => p.video_url).length;
console.log(`${frozenPlayers.length} travelers (${frozenPlayers.filter((p) => p.image_url).length} drawn, ${clips} with a clip), ${snapshot.orbits.length} orbit entries, ${scans.length} scans`);
console.log(`${Object.keys(snapshot.passes).length} bound passes of ${tags.length}, ${Object.keys(snapshot.sessions).length} sessions`);
console.log(`legacy friend pairs settled into orbits: ${settled}; unanswered orbit requests dropped: ${pending}`);
console.log(`copied ${(bytes / 1e6).toFixed(1)} MB into public/app/kin/; wrote lib/frozen.json (${(json.length / 1e3).toFixed(0)} kB)`);
