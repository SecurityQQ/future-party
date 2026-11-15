import "server-only";
import { db, type Player } from "./db";
import { jobState, startVideo } from "./varg";

// The H3 step: every finished Kin picture is animated once with MiniMax H3 (image to video). The
// picture is both the first and the last frame, so the 5-second clip loops on the card without a
// jump. 720p (768x1024), about 30¢ and 80-90 s a clip (tested 2026-11-15). The MP4 is kept next to
// the picture in Supabase Storage, and the `videos` row keeps picture, clip and job together.
export const CLIP = { model: "minimax_h3", aspect: "3:4", duration: 5, resolution: "720p", loop: true };
const MAX_ATTEMPTS = 2; // one retry, then the card keeps its still picture
const START_STALE_MS = 90_000; // a submit that never finished (the function was stopped)
const FINAL_STALE_MS = 120_000; // a store that never finished
const TIMEOUT_MS = 10 * 60_000;

export type Video = {
  image_url: string;
  player_id: string;
  model: string;
  prompt: string | null;
  job_id: string | null;
  attempts: number;
  status: "starting" | "retry" | "generating" | "finalizing" | "done" | "failed";
  error: string | null;
  video_url: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};
export type ClipStatus = Video["status"] | "none";

// Motion only: the picture already carries the look, so the prompt names what moves and asks for
// everything else to stay. No sign names (they pull zodiac glyphs into the frame).
export function clipPrompt(subject: string): string {
  return [
    `Bring the character in this picture (${subject.slice(0, 200)}) to life in a short, gentle idle animation:`,
    "it breathes, blinks, tilts its head and makes one small playful movement, then settles back into its starting pose.",
    "The camera stays still. Keep the character's look, colours, materials, lighting and the background exactly as in the picture.",
    "Smooth, calm motion. No text, no new characters, no cuts.",
  ].join(" ");
}

const now = () => new Date().toISOString();
const age = (v: Video) => Date.now() - new Date(v.updated_at).getTime();
const msg = (e: any) => String(e?.message || e).slice(0, 500);

async function getVideo(image: string): Promise<Video | null> {
  const { data } = await db().from("videos").select("*").eq("image_url", image).maybeSingle();
  return (data as Video) ?? null;
}

// The clip already made for a picture, if any (switching between a Kin's two versions).
export async function clipFor(image: string | null): Promise<string | null> {
  if (!image) return null;
  const v = await getVideo(image);
  return v?.status === "done" ? v.video_url : null;
}

export async function clipStatus(p: Pick<Player, "status" | "image_url">): Promise<ClipStatus> {
  if (p.status !== "done" || !p.image_url) return "none";
  return (await getVideo(p.image_url))?.status ?? "none";
}

// Move a row forward only if nobody else did first (same status and stamp), so of all the pollers
// that see the same row, exactly one starts, retries or stores its clip.
async function move(v: Video, fields: Partial<Video>): Promise<Video | null> {
  const { data } = await db()
    .from("videos")
    .update({ ...fields, updated_at: now() })
    .eq("image_url", v.image_url)
    .eq("status", v.status)
    .eq("updated_at", v.updated_at)
    .select("*");
  return (data?.[0] as Video) ?? null;
}

async function submit(v: Video): Promise<Video | null> {
  try {
    const jobId = await startVideo({ ...CLIP, prompt: v.prompt || clipPrompt("the character"), image: v.image_url });
    return await move(v, { status: "generating", job_id: jobId, attempts: v.attempts + 1, error: null });
  } catch (e) {
    const attempts = v.attempts + 1;
    return await move(v, { status: attempts >= MAX_ATTEMPTS ? "failed" : "retry", attempts, error: msg(e) });
  }
}

// Keep the MP4 in the characters bucket, in the player's folder next to their pictures.
async function store(v: Video, url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  const path = `${v.player_id}/clip-${Date.now().toString(36)}.mp4`;
  const bucket = db().storage.from("characters");
  const { error } = await bucket.upload(path, body, { contentType: "video/mp4", upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`upload: ${error.message}`);
  return bucket.getPublicUrl(path).data.publicUrl;
}

// Put the clip on the card, if its picture is still the one the card shows.
async function show(v: Video) {
  await db().from("players").update({ video_url: v.video_url }).eq("id", v.player_id).eq("image_url", v.image_url);
}

// Move the clip of the player's current picture one step forward: start it, check it, retry or
// store it. Safe to call from every poll.
export async function advanceClip(p: Player): Promise<Video | null> {
  if (p.status !== "done" || !p.image_url) return null;
  let v = await getVideo(p.image_url);
  if (!v) {
    const { data } = await db()
      .from("videos")
      .upsert(
        { image_url: p.image_url, player_id: p.id, model: CLIP.model, prompt: clipPrompt(p.subject), status: "starting" },
        { onConflict: "image_url", ignoreDuplicates: true },
      )
      .select("*");
    if (data?.length) return submit(data[0] as Video); // this caller created the row: it starts the job
    v = await getVideo(p.image_url);
    if (!v) return null;
  }

  switch (v.status) {
    case "done":
      if (p.video_url !== v.video_url) await show(v);
      return v;
    case "failed":
      return v;
    case "retry":
    case "starting": {
      if (v.status === "starting" && age(v) < START_STALE_MS) return v;
      const mine = await move(v, { status: "starting" });
      return mine ? submit(mine) : getVideo(v.image_url);
    }
    case "finalizing":
      if (age(v) < FINAL_STALE_MS) return v;
      return (await move(v, { status: "generating" })) ?? getVideo(v.image_url);
  }

  // generating
  if (!v.job_id) return (await move(v, { status: "retry" })) ?? v;
  let st;
  try {
    st = await jobState(v.job_id);
  } catch {
    return v; // varg unreachable for a moment: the next poll tries again
  }
  if (st.status === "running") {
    if (age(v) < TIMEOUT_MS) return v;
    st = { status: "failed" as const, error: "timed out" };
  }
  if (st.status === "failed") {
    if (v.attempts >= MAX_ATTEMPTS) return (await move(v, { status: "failed", error: st.error.slice(0, 500) })) ?? v;
    const mine = await move(v, { status: "starting", error: st.error.slice(0, 500) });
    return mine ? submit(mine) : getVideo(v.image_url);
  }
  const locked = await move(v, { status: "finalizing" });
  if (!locked) return getVideo(v.image_url);
  try {
    const url = await store(locked, st.url);
    const done = await move(locked, { status: "done", video_url: url, source_url: st.url, error: null });
    if (done) await show(done);
    return done;
  } catch (e) {
    return (await move(locked, { status: "generating", error: msg(e) })) ?? locked;
  }
}
