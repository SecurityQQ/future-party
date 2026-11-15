import "server-only";
import { randomInt } from "node:crypto";
import sharp from "sharp";
import presets from "./presets.json";
import { db, type Guest, type Player, type Rarity } from "./db";
import { signFor } from "./zodiac";
import { jobState, startImage } from "./varg";
import { advanceClip, clipFor } from "./video";

// Card finish = the playground style; rarer finishes are the showier materials.
export const FINISHES: { style: string; rarity: Rarity; weight: number }[] = [
  { style: "plush", rarity: "common", weight: 20 },
  { style: "porcelain", rarity: "common", weight: 16 },
  { style: "airbrush", rarity: "common", weight: 16 },
  { style: "neonpunk", rarity: "rare", weight: 10 },
  { style: "cyborg", rarity: "rare", weight: 9 },
  { style: "chrome", rarity: "rare", weight: 9 },
  { style: "crystal", rarity: "epic", weight: 6 },
  { style: "hologlass", rarity: "epic", weight: 5 },
  { style: "wireframe", rarity: "epic", weight: 4 },
  { style: "rhinestone", rarity: "legendary", weight: 5 },
];

// Attempt n uses MODELS[n]: GPT Image 2.6 (the user's pick in the playground), then fallbacks.
const MODELS = ["gpt_image_2_6", "gpt_image_2_6", "nano_banana_2_1", "seedream_5_5"];
const MAX_ATTEMPTS = MODELS.length;
const ASPECT = "3:4";

function weighted<T extends { weight: number }>(items: T[]): T {
  let r = randomInt(items.reduce((a, b) => a + b.weight, 0));
  for (const it of items) if ((r -= it.weight) < 0) return it;
  return items[0];
}

// Fill {placeholders}; a line whose placeholder is empty is dropped (same rule as the playground).
export function fill(template: string, vars: Record<string, string>): string {
  return template
    .split("\n")
    .map((line) => {
      let empty = false;
      const out = line.replace(/\{(\w+)\}/g, (m, k) => {
        if (!(k in vars)) return m;
        if (!vars[k]?.trim()) empty = true;
        return vars[k] ?? "";
      });
      return empty ? null : out;
    })
    .filter((l) => l !== null)
    .join("\n")
    .trim();
}

const title = (s: string) =>
  s.replace(/^(a|an|the)\s+/i, "").replace(/\b\w/g, (c) => c.toUpperCase());

export function styleLabel(id: string): string {
  return presets.styles.find((s) => s.id === id)?.label ?? id;
}

export type Plan = Pick<Player, "sign" | "element" | "character" | "subject" | "scene" | "style" | "rarity" | "prompt">;

export function planCharacter(birthday: string, guest: Guest | null, finish = weighted(FINISHES)): Plan {
  const z = signFor(birthday);
  const style = presets.styles.find((s) => s.id === finish.style)!;
  const randomScene = presets.scenes[randomInt(presets.scenes.length)];
  const fromGuest = !!guest?.subject;
  const subject = fromGuest ? guest!.subject! : z.animal;
  const scene = fromGuest ? guest!.scene || randomScene.text : randomScene.text;
  const character = fromGuest ? guest!.character || title(z.animal) : `${z.sign} ${title(z.animal)}`;
  const tone = (style as any).tone === "glow" ? "glow" : fromGuest ? guest!.tone : z.tone;
  const backdrops = presets.backdrops as Record<string, string>;
  const prompt = fill(presets.master.text, {
    subject,
    sign: z.sign,
    traits: z.traits,
    palette: (style as any).palette === false ? "" : (presets.elements as Record<string, string>)[z.element],
    style: style.text,
    scene,
    backdrop: backdrops[tone] ?? backdrops.mid,
  }).slice(0, 2000);
  return { sign: z.sign, element: z.element, character, subject, scene, style: style.id, rarity: finish.rarity, prompt };
}

async function update(id: string, fields: Partial<Player>) {
  const { data, error } = await db()
    .from("players")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`update player: ${error.message}`);
  return data as Player;
}

export async function getPlayer(id: string): Promise<Player | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("players").select("*").eq("id", id).maybeSingle();
  return (data as Player) ?? null;
}

// Start (or restart) the image job for the player's next attempt.
export async function startGeneration(p: Player): Promise<Player> {
  const model = MODELS[Math.min(p.attempts, MODELS.length - 1)];
  const spec = presets.models.find((m) => m.id === model) as any;
  try {
    const jobId = await startImage({ model, prompt: p.prompt!, aspect: ASPECT, providerOptions: spec?.providerOptions });
    return await update(p.id, { job_id: jobId, model, status: "generating", attempts: p.attempts + 1, error: null });
  } catch (e: any) {
    const attempts = p.attempts + 1;
    return await update(p.id, {
      status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
      attempts,
      error: String(e?.message || e).slice(0, 500),
    });
  }
}

// Download the finished image, shrink it to a 900px-wide WebP and keep it in Supabase Storage.
async function store(p: Player, url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const out = await sharp(input)
    .flatten({ background: "#0a1020" }) // GPT Image can return partly transparent PNGs
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const path = `${p.id}/${p.attempts}-${Date.now().toString(36)}.webp`;
  const bucket = db().storage.from("characters");
  const { error } = await bucket.upload(path, out, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`upload: ${error.message}`);
  return bucket.getPublicUrl(path).data.publicUrl;
}

// Move a player's character one step forward: start, check, retry or finish its image.
export async function refresh(id: string): Promise<Player | null> {
  let p = await getPlayer(id);
  if (!p) return null;
  const age = Date.now() - new Date(p.updated_at).getTime();
  if (p.status === "pending") return startGeneration(p);
  if (p.status === "finalizing" && age > 90_000) p = await update(p.id, { status: "generating" });
  if (p.status !== "generating" || !p.job_id) return p;

  let st;
  try {
    st = await jobState(p.job_id);
  } catch (e: any) {
    return p; // varg unreachable for a moment: try again on the next poll
  }
  if (st.status === "running") {
    if (age < 6 * 60_000) return p;
    st = { status: "failed" as const, error: "timed out" };
  }
  if (st.status === "failed") {
    if (p.attempts >= MAX_ATTEMPTS) return update(p.id, { status: "failed", error: st.error.slice(0, 500) });
    return startGeneration({ ...p, error: st.error });
  }
  // Done: one poller wins the lock and stores the image.
  const { data: locked } = await db()
    .from("players")
    .update({ status: "finalizing", updated_at: new Date().toISOString() })
    .eq("id", p.id)
    .eq("status", "generating")
    .eq("job_id", p.job_id)
    .select("id");
  if (!locked?.length) return getPlayer(p.id);
  try {
    const image = await store(p, st.url);
    return await update(p.id, { status: "done", image_url: image, source_url: st.url, error: null, video_url: null });
  } catch (e: any) {
    return await update(p.id, { status: "generating", error: String(e?.message || e).slice(0, 500) });
  }
}

// Keep checking in the background (after the response is sent) so the card finishes even if
// the person closes the page: first the picture, then its H3 clip (lib/video.ts, about 90 s more).
// Whatever is left when the budget runs out, the card's own polling finishes.
export async function pollUntilSettled(id: string, budgetMs = 270_000) {
  const end = Date.now() + budgetMs;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, 3500));
    const p = await refresh(id).catch(() => null);
    if (!p || p.status === "failed") return;
    if (p.status !== "done") continue;
    const v = await advanceClip(p).catch(() => null);
    if (!v || v.status === "done" || v.status === "failed") return;
    await new Promise((r) => setTimeout(r, 4000));
  }
}

// A fresh prompt and attempts reset. The owner's retry keeps the finish (no rerolling for a
// legendary card); the admin page can reroll it.
export async function regenerate(p: Player, guest: Guest | null, reroll = false): Promise<Player> {
  const keep = reroll ? undefined : FINISHES.find((f) => f.style === p.style);
  const plan = planCharacter(p.birthday, guest, keep);
  const fresh = await update(p.id, { ...plan, status: "pending", attempts: 0, job_id: null, error: null });
  return startGeneration(fresh);
}

// A card by its share-link id: the card number (/c/7) or the player id (older links).
export async function findPlayer(id: string): Promise<Player | null> {
  if (/^\d{1,6}$/.test(id)) {
    const { data } = await db().from("players").select("*").eq("card_no", Number(id)).maybeSingle();
    return (data as Player) ?? null;
  }
  return getPlayer(id);
}

// How many redraws with feedback a guest gets during onboarding.
export const REDRAWS = 1;

const FEEDBACK_MARK = "\n\nChanges the guest asked for after seeing the first picture:";

// The one redraw during onboarding: the same Kin idea and finish, plus what the guest wants
// changed. The first picture is kept in prev_image_url so they can switch back.
export async function redrawWithFeedback(p: Player, feedback: string): Promise<Player> {
  const base = (p.prompt ?? "").split(FEEDBACK_MARK)[0];
  const prompt = `${base}${FEEDBACK_MARK} ${feedback}\nApply these changes; keep whatever else fits the description above.`;
  const fresh = await update(p.id, {
    prompt,
    feedback,
    redraws: p.redraws + 1,
    prev_image_url: p.image_url,
    image_url: null,
    video_url: null,
    status: "pending",
    attempts: 0,
    job_id: null,
    error: null,
  });
  return startGeneration(fresh);
}

// Switch between the first picture and the redraw (only once neither is still drawing).
export async function swapVersion(p: Player): Promise<Player> {
  if (!p.prev_image_url) return p;
  // Each picture keeps its own clip (videos table), so the other version comes back with its clip.
  const video_url = await clipFor(p.prev_image_url);
  return update(p.id, { image_url: p.prev_image_url, prev_image_url: p.image_url, video_url, status: "done", error: null });
}
