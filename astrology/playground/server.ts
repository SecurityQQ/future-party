// Character playground: master prompt + subject -> a batch of images from varg, rated in the browser.
// Run: bun server.ts   (reads VARG_API_KEY from the environment or ~/.varg/credentials)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, extname, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const ROOT = import.meta.dir;
const ASSETS = resolve(ROOT, "../assets");
const RUNS = join(ROOT, "runs");
const CACHE = join(ROOT, ".cache");
const PRESETS = join(ROOT, "presets.json");
const PORT = Number(process.env.PORT || 4300);
const API = "https://api.varg.ai/v2";
for (const d of [RUNS, CACHE, join(CACHE, "thumbs"), join(CACHE, "refs")]) mkdirSync(d, { recursive: true });

function loadKey(): string {
  if (process.env.VARG_API_KEY) return process.env.VARG_API_KEY;
  try {
    return JSON.parse(readFileSync(join(homedir(), ".varg/credentials"), "utf8")).api_key || "";
  } catch {
    return "";
  }
}
const KEY = loadKey();
if (!KEY) console.warn("No varg API key found (VARG_API_KEY or ~/.varg/credentials). Generation will fail.");

// ---------- types ----------
type Img = {
  i: number;
  prompt: string;
  model: string;
  style: string | null;
  scene: string | null;
  status: "queued" | "running" | "done" | "failed";
  jobId?: string;
  url?: string;
  file?: string;
  cost?: number;
  error?: string;
  stars?: number;
  note?: string;
  promptNote?: string;
  parent?: number;
  refs?: string[];
  started: number;
  finished?: number;
};
type Run = {
  id: string;
  created: string;
  subject: string;
  sign: string;
  traits: string;
  palette: string;
  master: { id: string; text: string; edited: boolean };
  aspect: string;
  refs: string[];
  refMode?: string;
  autoRefs?: { style: boolean; scene: boolean };
  ab?: boolean;
  vary: { style: boolean; scene: boolean; model: boolean };
  note: string;
  images: Img[];
};

// ---------- helpers ----------
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const readPresets = () => JSON.parse(readFileSync(PRESETS, "utf8"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "run";

const runs = new Map<string, Run>();
for (const d of readdirSync(RUNS)) {
  const f = join(RUNS, d, "run.json");
  if (existsSync(f)) runs.set(d, JSON.parse(readFileSync(f, "utf8")));
}
function save(run: Run) {
  writeFileSync(join(RUNS, run.id, "run.json"), JSON.stringify(run, null, 2));
}

function shuffled<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
// Spread each pool evenly over n slots, in random order.
function spread<T>(pool: T[], n: number): T[] {
  const out: T[] = [];
  while (out.length < n) out.push(...shuffled(pool));
  return out.slice(0, n);
}

// Fill {placeholders}; a line whose placeholder is empty is dropped.
function fill(template: string, vars: Record<string, string>): string {
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

async function varg(path: string, body?: unknown, attempt = 0): Promise<any> {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(Number(res.headers.get("Retry-After") || 0) * 1000 || 1500 * (attempt + 1));
    return varg(path, body, attempt + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `varg ${res.status}`);
  return data;
}

// ---------- reference uploads ----------
const uploadsFile = join(CACHE, "uploads.json");
const uploads: Record<string, string> = existsSync(uploadsFile) ? JSON.parse(readFileSync(uploadsFile, "utf8")) : {};
function safeAsset(rel: string): string {
  const p = resolve(ASSETS, rel);
  if (!p.startsWith(ASSETS + "/") || !existsSync(p)) throw new Error(`bad reference path: ${rel}`);
  return p;
}
async function refUrl(rel: string): Promise<string> {
  // A generated image: "run:<runId>/<file>" already lives on varg.
  if (rel.startsWith("run:")) {
    const [runId, file] = rel.slice(4).split("/");
    const img = runs.get(runId)?.images.find((x) => x.file === file);
    if (!img?.url) throw new Error(`reference image not found: ${rel}`);
    return img.url;
  }
  const src = safeAsset(rel);
  const hash = createHash("sha256").update(rel + statSync(src).mtimeMs).digest("hex").slice(0, 24);
  if (uploads[hash]) return uploads[hash];
  const out = join(CACHE, "refs", hash + ".jpg");
  if (!existsSync(out)) Bun.spawnSync(["sips", "-Z", "1536", "-s", "format", "jpeg", src, "--out", out]);
  const res = await fetch(API + "/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "image/jpeg", "X-Filename": basename(out) },
    body: Bun.file(out),
  });
  const data: any = await res.json();
  if (!res.ok || !data.url) throw new Error(data?.error?.message || "upload failed");
  uploads[hash] = data.url;
  writeFileSync(uploadsFile, JSON.stringify(uploads, null, 2));
  return data.url;
}

// ---------- generation ----------
const MODERATION = /nudity|sexual|moderation|safety|content policy|flagged/i;
async function generate(run: Run, img: Img, attempt = 0) {
  try {
    const files = await Promise.all((img.refs ?? run.refs).map(async (r) => ({ url: await refUrl(r) })));
    const job = await varg("/image", {
      model: img.model,
      prompt: img.prompt,
      aspect_ratio: run.aspect,
      ...(files.length ? { files } : {}),
      options: { cache: false },
    });
    img.jobId = job.id;
    img.status = "running";
    save(run);
    await poll(run, img);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (MODERATION.test(msg) && attempt < 1) {
      // These filters misfire on cute animals; the same request usually passes the second time.
      img.jobId = undefined;
      return generate(run, img, attempt + 1);
    }
    img.status = "failed";
    img.error = msg;
    img.finished = Date.now();
    save(run);
  }
}

async function poll(run: Run, img: Img) {
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    const job = await varg(`/jobs/${img.jobId}`);
    if (job.status === "completed") {
      const out = job.output?.outputs?.[0];
      if (!out?.url) throw new Error("job completed without an image");
      img.url = out.url;
      img.cost = job.actual_cost_cents ?? job.estimated_cost_cents;
      const ext = (out.media_type?.split("/")[1] || extname(new URL(out.url).pathname).slice(1) || "png").replace("jpeg", "jpg");
      const name = `${String(img.i).padStart(2, "0")}.${ext}`;
      const bytes = await (await fetch(out.url)).arrayBuffer();
      writeFileSync(join(RUNS, run.id, name), Buffer.from(bytes));
      img.file = name;
      img.status = "done";
      img.finished = Date.now();
      save(run);
      return;
    }
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(job.error?.message || job.error || `job ${job.status}`);
    }
    await sleep(2500);
  }
  throw new Error("timed out waiting for the image");
}

async function startImages(run: Run, imgs: Img[]) {
  // Upload each distinct reference once before the jobs start.
  const all = [...new Set(imgs.flatMap((i) => i.refs ?? run.refs))];
  await Promise.all(all.map((r) => refUrl(r).catch(() => null)));
  await Promise.all(imgs.map((img) => generate(run, img)));
}

// Resume anything that was in flight when the server stopped.
for (const run of runs.values()) {
  const pending = run.images.filter((i) => i.status === "running" && i.jobId);
  for (const img of pending)
    poll(run, img).catch((e) => {
      img.status = "failed";
      img.error = String(e?.message || e);
      save(run);
    });
  const queued = run.images.filter((i) => i.status === "queued");
  if (queued.length) startImages(run, queued);
}

function createRun(body: any): Run {
  const p = readPresets();
  const n = Math.max(1, Math.min(24, Number(body.n) || 10));
  const styles: string[] = body.styles?.length ? body.styles : [];
  const scenes: string[] = body.scenes?.length ? body.scenes : [];
  const models: string[] = body.models?.length ? body.models : ["nano_banana_2_1"];
  const vary = { style: styles.length > 1, scene: scenes.length > 1, model: models.length > 1 };
  const autoRefs = { style: !!body.autoRefs?.style, scene: !!body.autoRefs?.scene };
  const ab = !!body.ab;
  const manual: string[] = (body.refs || []).slice(0, 6);
  const refMode = p.refModes.find((m: any) => m.id === body.refMode) ?? p.refModes[0];
  // A/B: every combination is made twice, once with references and once without.
  const k = ab ? Math.ceil(n / 2) : n;
  const styleSeq = vary.style ? spread(styles, k) : Array(k).fill(styles[0] ?? null);
  const sceneSeq = vary.scene ? spread(scenes, k) : Array(k).fill(scenes[0] ?? null);
  const modelSeq = vary.model ? spread(models, k) : Array(k).fill(models[0]);
  const master = body.master || p.masters.at(-1);
  const created = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  const stamp = `${created.getFullYear()}${pad(created.getMonth() + 1)}${pad(created.getDate())}-${pad(created.getHours())}${pad(created.getMinutes())}${pad(created.getSeconds())}`;
  const run: Run = {
    id: `${stamp}-${slug(body.subject || "subject")}`,
    created: created.toISOString(),
    subject: body.subject || p.defaults.subject,
    sign: body.sign || p.defaults.sign,
    traits: body.traits || p.defaults.traits,
    palette: body.palette || p.defaults.palette,
    master: { id: master.id, text: master.text, edited: !!master.edited },
    aspect: body.aspect || "3:4",
    refs: manual,
    refMode: refMode.id,
    autoRefs,
    ab,
    vary,
    note: "",
    images: [],
  };
  const find = (kind: string, id: string | null) => p[kind].find((s: any) => s.id === id);
  for (let c = 0; c < k && run.images.length < n; c++) {
    const style = styleSeq[c], scene = sceneSeq[c], model = modelSeq[c];
    const refs = [
      ...new Set([
        ...manual,
        ...(autoRefs.style ? find("styles", style)?.refs ?? [] : []),
        ...(autoRefs.scene ? find("scenes", scene)?.refs ?? [] : []),
      ]),
    ].slice(0, 6) as string[];
    const base = fill(run.master.text, {
      subject: run.subject,
      sign: run.sign,
      traits: run.traits,
      palette: find("styles", style)?.palette === false ? "" : run.palette,
      style: find("styles", style)?.text ?? "",
      scene: find("scenes", scene)?.text ?? "",
    });
    const variants = ab ? [refs, []] : [refs];
    for (const r of variants) {
      if (run.images.length >= n) break;
      run.images.push({
        i: run.images.length,
        prompt: (r.length ? base + "\n" + refMode.text : base).slice(0, 2000),
        model,
        style,
        scene,
        refs: r,
        status: "queued",
        started: Date.now(),
      });
    }
  }
  mkdirSync(join(RUNS, run.id), { recursive: true });
  runs.set(run.id, run);
  save(run);
  startImages(run, run.images);
  return run;
}

function summary(run: Run) {
  const done = run.images.filter((i) => i.status === "done");
  const rated = run.images.filter((i) => i.stars);
  return {
    id: run.id,
    created: run.created,
    subject: run.subject,
    sign: run.sign,
    master: run.master.id + (run.master.edited ? "*" : ""),
    n: run.images.length,
    done: done.length,
    rated: rated.length,
    avg: rated.length ? rated.reduce((a, b) => a + (b.stars || 0), 0) / rated.length : null,
    cover: done.sort((a, b) => (b.stars || 0) - (a.stars || 0))[0]?.file ?? null,
  };
}

function stats() {
  const groups: Record<string, Record<string, number[]>> = { style: {}, scene: {}, model: {}, refs: {}, master: {}, subject: {} };
  for (const run of runs.values())
    for (const img of run.images) {
      if (!img.stars) continue;
      const keys: Record<string, string> = {
        style: img.style ?? "(none)",
        scene: img.scene ?? "(none)",
        model: img.model,
        refs: (img.refs ?? run.refs).length ? `with refs · ${run.refMode ?? "mood"}` : "no refs",
        master: run.master.id + (run.master.edited ? "*" : ""),
        subject: run.subject,
      };
      for (const [g, k] of Object.entries(keys)) (groups[g][k] ??= []).push(img.stars);
    }
  const out: Record<string, any[]> = {};
  for (const [g, m] of Object.entries(groups))
    out[g] = Object.entries(m)
      .map(([key, s]) => ({ key, n: s.length, avg: s.reduce((a, b) => a + b, 0) / s.length, top: s.filter((x) => x >= 4).length }))
      .sort((a, b) => b.avg - a.avg || b.n - a.n);
  return out;
}

function best(min = 4) {
  const out: any[] = [];
  for (const run of runs.values())
    for (const img of run.images)
      if ((img.stars || 0) >= min && img.file)
        out.push({ run: run.id, subject: run.subject, sign: run.sign, ...img });
  return out.sort((a, b) => b.stars - a.stars || b.started - a.started);
}

// Plain-text digest of every rating and note, newest run first: what Claude reads to iterate.
function feedback(): string {
  const p = readPresets();
  const label = (kind: string, id: string | null) => p[kind].find((x: any) => x.id === id)?.label ?? id ?? "-";
  const lines: string[] = [];
  const mfb = p.masters.filter((x: any) => x.feedback);
  if (mfb.length) {
    lines.push("# Feedback on master prompt versions");
    for (const x of mfb) lines.push(`- ${x.id}: ${x.feedback}`);
    lines.push("");
  }
  const all = [...runs.values()].sort((a, b) => b.created.localeCompare(a.created));
  for (const run of all) {
    const rated = run.images.filter((i) => i.stars || i.note || i.promptNote);
    if (!rated.length && !run.note) continue;
    lines.push(`## ${run.id} · ${run.subject} · ${run.sign} · master ${run.master.id}${run.master.edited ? " (edited)" : ""} · ${run.aspect}${run.refs.length ? ` · own refs: ${run.refs.join(", ")}` : ""}${run.autoRefs?.style || run.autoRefs?.scene ? ` · auto refs: ${[run.autoRefs.style && "style", run.autoRefs.scene && "scene"].filter(Boolean).join("+")}` : ""}${run.ab ? " · A/B" : ""}`);
    if (run.note) lines.push(`Run note: ${run.note}`);
    for (const img of [...rated].sort((a, b) => (b.stars || 0) - (a.stars || 0)))
      lines.push(`- #${img.i + 1} ${img.stars ? "★".repeat(img.stars) : "unrated"} · ${label("styles", img.style)} · ${label("scenes", img.scene)} · ${img.model} · ${(img.refs ?? run.refs).length ? `${(img.refs ?? run.refs).length} refs (${run.refMode ?? "mood"})` : "no refs"}${img.note ? ` · "${img.note}"` : ""}${img.promptNote ? `\n    prompt feedback: "${img.promptNote}"` : ""}`);
    const unrated = run.images.filter((i) => i.status === "done" && !i.stars).length;
    if (unrated) lines.push(`- ${unrated} more unrated`);
    lines.push("");
  }
  return lines.join("\n") || "No ratings or notes yet.";
}

const priceCache = new Map<string, number>();
async function price(model: string, refs: boolean): Promise<number | null> {
  const k = model + refs;
  if (priceCache.has(k)) return priceCache.get(k)!;
  try {
    const body: any = { tool: "image", model, prompt: "price check", aspect_ratio: "3:4" };
    if (refs) body.files = [{ url: "https://s3.varg.ai/files/placeholder.jpg" }];
    const r = await varg("/estimate", body);
    const c = r?.pricing?.user_price_cents ?? null;
    if (c != null) priceCache.set(k, c);
    return c;
  } catch {
    return null;
  }
}

// ---------- your own references ----------
const UPLOADS = join(ASSETS, "uploads");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/gif": "gif" };
function saveUpload(bytes: ArrayBuffer, type: string, name: string): string {
  const ext = EXT[type.split(";")[0].trim()];
  if (!ext) throw new Error(`not an image: ${type || "unknown type"}`);
  if (bytes.byteLength > 30 * 1024 * 1024) throw new Error("image is over 30 MB");
  mkdirSync(UPLOADS, { recursive: true });
  const base = slug(name.replace(/\.[a-z0-9]+$/i, "")).slice(0, 40) || "image";
  const hash = createHash("sha1").update(Buffer.from(bytes)).digest("hex").slice(0, 8);
  const file = `${base}-${hash}.${ext}`;
  writeFileSync(join(UPLOADS, file), Buffer.from(bytes));
  return `uploads/${file}`;
}

// ---------- static ----------
function serveFile(base: string, rel: string) {
  const p = resolve(base, decodeURIComponent(rel));
  if (!p.startsWith(base + "/") || !existsSync(p)) return new Response("not found", { status: 404 });
  return new Response(Bun.file(p), { headers: { "Cache-Control": "max-age=3600" } });
}
function thumb(rel: string) {
  const src = safeAsset(rel);
  const out = join(CACHE, "thumbs", createHash("sha1").update(rel).digest("hex") + ".jpg");
  if (!existsSync(out)) Bun.spawnSync(["sips", "-Z", "360", "-s", "format", "jpeg", src, "--out", out]);
  return new Response(Bun.file(out), { headers: { "Cache-Control": "max-age=86400" } });
}
function listRefs() {
  const out: Record<string, string[]> = {};
  const dirs = readdirSync(ASSETS).sort((a, b) => (a === "uploads" ? -1 : b === "uploads" ? 1 : a.localeCompare(b)));
  for (const dir of dirs) {
    const full = join(ASSETS, dir);
    if (!statSync(full).isDirectory()) continue;
    out[dir] = readdirSync(full)
      .filter((f) => /\.(jpe?g|png|webp|heic|gif)$/i.test(f))
      .map((f) => `${dir}/${f}`);
  }
  return out;
}

// ---------- routes ----------
Bun.serve({
  port: PORT,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const m = (re: RegExp) => path.match(re);
    try {
      if (path === "/" || path === "/index.html") return new Response(Bun.file(join(ROOT, "index.html")));
      if (path.startsWith("/runs/")) return serveFile(RUNS, path.slice(6));
      if (path === "/thumb") return thumb(url.searchParams.get("p") || "");
      if (path.startsWith("/assets/")) return serveFile(ASSETS, path.slice(8));

      if (path === "/api/config") return json({ ...readPresets(), refs: listRefs() });
      if (path === "/api/masters" && req.method === "POST") {
        const body: any = await req.json();
        const p = readPresets();
        const n = p.masters.reduce((a: number, m: any) => Math.max(a, Number(String(m.id).replace(/\D/g, "")) || 0), 0) + 1;
        const master = { id: `v${n}`, created: new Date().toISOString().slice(0, 10), note: body.note || "", text: body.text };
        p.masters.push(master);
        writeFileSync(PRESETS, JSON.stringify(p, null, 2) + "\n");
        return json(master);
      }
      if (path === "/api/upload" && req.method === "POST") {
        const name = decodeURIComponent(req.headers.get("X-Filename") || "image");
        return json({ path: saveUpload(await req.arrayBuffer(), req.headers.get("Content-Type") || "", name) });
      }
      if (path === "/api/upload-url" && req.method === "POST") {
        const { url: src } = (await req.json()) as any;
        if (!/^https?:\/\//.test(src || "")) return json({ error: "give a direct http(s) link to an image" }, 400);
        const res = await fetch(src, { redirect: "follow" });
        if (!res.ok) return json({ error: `could not download (${res.status})` }, 400);
        const type = res.headers.get("Content-Type") || "";
        if (!type.startsWith("image/")) return json({ error: "that link is a page, not an image: open the image itself and copy its address" }, 400);
        return json({ path: saveUpload(await res.arrayBuffer(), type, new URL(src).pathname.split("/").pop() || "image") });
      }
      let mf = m(/^\/api\/masters\/([^/]+)\/feedback$/);
      if (mf && req.method === "POST") {
        const p = readPresets();
        const master = p.masters.find((x: any) => x.id === mf![1]);
        if (!master) return json({ error: "no such master version" }, 404);
        master.feedback = ((await req.json()) as any).feedback || undefined;
        writeFileSync(PRESETS, JSON.stringify(p, null, 2) + "\n");
        return json(master);
      }
      if (path === "/api/balance") {
        const b = await varg("/billing/balance");
        return json({ usd: b.available_usd, credits: b.available });
      }
      if (path === "/api/price") {
        const models = (url.searchParams.get("models") || "").split(",").filter(Boolean);
        const refs = url.searchParams.get("refs") === "1";
        const entries = await Promise.all(models.map(async (mm) => [mm, await price(mm, refs)]));
        return json(Object.fromEntries(entries));
      }
      if (path === "/api/runs" && req.method === "POST") return json(createRun(await req.json()));
      if (path === "/api/runs")
        return json([...runs.values()].sort((a, b) => b.created.localeCompare(a.created)).map(summary));
      if (path === "/api/stats") return json(stats());
      if (path === "/api/feedback") return new Response(feedback(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      if (path === "/api/best") return json(best(Number(url.searchParams.get("min") || 4)));

      let r = m(/^\/api\/runs\/([^/]+)$/);
      if (r) {
        const run = runs.get(r[1]);
        return run ? json(run) : json({ error: "no such run" }, 404);
      }
      r = m(/^\/api\/runs\/([^/]+)\/rate$/);
      if (r && req.method === "POST") {
        const run = runs.get(r[1]);
        if (!run) return json({ error: "no such run" }, 404);
        const body: any = await req.json();
        const img = run.images[body.i];
        if (!img) return json({ error: "no such image" }, 404);
        if ("stars" in body) img.stars = body.stars || undefined;
        if ("note" in body) img.note = body.note || undefined;
        if ("promptNote" in body) img.promptNote = body.promptNote || undefined;
        save(run);
        return json(img);
      }
      r = m(/^\/api\/runs\/([^/]+)\/note$/);
      if (r && req.method === "POST") {
        const run = runs.get(r[1]);
        if (!run) return json({ error: "no such run" }, 404);
        run.note = ((await req.json()) as any).note || "";
        save(run);
        return json({ ok: true });
      }
      r = m(/^\/api\/runs\/([^/]+)\/retry$/);
      if (r && req.method === "POST") {
        const run = runs.get(r[1]);
        const img = run?.images[((await req.json()) as any).i];
        if (!run || !img) return json({ error: "no such image" }, 404);
        if (img.status !== "failed") return json(run);
        Object.assign(img, { status: "queued", error: undefined, jobId: undefined, started: Date.now(), finished: undefined });
        save(run);
        startImages(run, [img]);
        return json(run);
      }
      r = m(/^\/api\/runs\/([^/]+)\/more$/);
      if (r && req.method === "POST") {
        const run = runs.get(r[1]);
        if (!run) return json({ error: "no such run" }, 404);
        const body: any = await req.json();
        const src = run.images[body.i];
        const count = Math.max(1, Math.min(8, Number(body.count) || 4));
        const fresh: Img[] = [];
        for (let k = 0; k < count; k++) {
          const img: Img = {
            i: run.images.length,
            prompt: src.prompt,
            model: src.model,
            style: src.style,
            scene: src.scene,
            refs: src.refs,
            parent: src.i,
            status: "queued",
            started: Date.now(),
          };
          run.images.push(img);
          fresh.push(img);
        }
        save(run);
        startImages(run, fresh);
        return json(run);
      }
      return new Response("not found", { status: 404 });
    } catch (e: any) {
      return json({ error: String(e?.message || e) }, 500);
    }
  },
});
console.log(`Character playground on http://localhost:${PORT}`);
