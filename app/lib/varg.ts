import "server-only";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "https://api.varg.ai/v2";

// One line of a dotenv file, without printing or exporting anything else from it.
function fromDotenv(file: string, name: string): string {
  try {
    const line = readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2") : "";
  } catch {
    return "";
  }
}

// VARG_API_KEY (always set on Vercel); locally the repo's own .env (one level up from app/),
// else the local varg login. The playground server looks it up the same way.
function key(): string {
  if (process.env.VARG_API_KEY) return process.env.VARG_API_KEY;
  const local = fromDotenv(join(process.cwd(), "..", ".env"), "VARG_API_KEY");
  if (local) return local;
  try {
    return JSON.parse(readFileSync(join(homedir(), ".varg/credentials"), "utf8")).api_key || "";
  } catch {
    return "";
  }
}

async function call(path: string, body?: unknown, attempt = 0): Promise<any> {
  const k = key();
  if (!k) throw new Error("VARG_API_KEY is not set");
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    return call(path, body, attempt + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `varg ${res.status}`);
  return data;
}

export async function startImage(input: { model: string; prompt: string; aspect: string; providerOptions?: unknown }): Promise<string> {
  const job = await call("/image", {
    model: input.model,
    prompt: input.prompt,
    aspect_ratio: input.aspect,
    ...(input.providerOptions ? { provider_options: input.providerOptions } : {}),
    options: { cache: false },
  });
  if (!job?.id) throw new Error("varg returned no job id");
  return job.id as string;
}

// Image to video. `loop` sends the picture as the last frame too, so the clip ends where it began.
export async function startVideo(input: {
  model: string; prompt: string; image: string; aspect: string; duration: number; resolution: string; loop?: boolean;
}): Promise<string> {
  const job = await call("/tools/video/call", {
    model: input.model,
    prompt: input.prompt,
    files: [{ url: input.image }],
    aspect_ratio: input.aspect,
    duration: input.duration,
    resolution: input.resolution,
    ...(input.loop ? { provider_options: { fal: { end_image_url: input.image } } } : {}),
    options: { cache: false },
  });
  if (!job?.id) throw new Error("varg returned no job id");
  return job.id as string;
}

export type JobState =
  | { status: "running" }
  | { status: "done"; url: string; mediaType?: string }
  | { status: "failed"; error: string };

export async function jobState(id: string): Promise<JobState> {
  const job = await call(`/jobs/${id}`);
  if (job.status === "completed") {
    const out = job.output?.outputs?.[0];
    if (!out?.url) return { status: "failed", error: "job completed without a file" };
    return { status: "done", url: out.url, mediaType: out.media_type };
  }
  if (job.status === "failed" || job.status === "cancelled") {
    const e = job.error?.message || job.error || `job ${job.status}`;
    return { status: "failed", error: typeof e === "string" ? e : JSON.stringify(e) };
  }
  return { status: "running" };
}
