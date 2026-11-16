import "server-only";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { aiPaused } from "./paused";

const API = "https://api.varg.ai/v2";

// Same lookup as the playground server: VARG_API_KEY, else the local varg login (dev only).
function key(): string {
  if (process.env.VARG_API_KEY) return process.env.VARG_API_KEY;
  try {
    return JSON.parse(readFileSync(join(homedir(), ".varg/credentials"), "utf8")).api_key || "";
  } catch {
    return "";
  }
}

async function call(path: string, body?: unknown, attempt = 0): Promise<any> {
  if (aiPaused()) throw new Error("image generation is paused");
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

export type JobState =
  | { status: "running" }
  | { status: "done"; url: string; mediaType?: string }
  | { status: "failed"; error: string };

export async function jobState(id: string): Promise<JobState> {
  const job = await call(`/jobs/${id}`);
  if (job.status === "completed") {
    const out = job.output?.outputs?.[0];
    if (!out?.url) return { status: "failed", error: "job completed without an image" };
    return { status: "done", url: out.url, mediaType: out.media_type };
  }
  if (job.status === "failed" || job.status === "cancelled") {
    const e = job.error?.message || job.error || `job ${job.status}`;
    return { status: "failed", error: typeof e === "string" ? e : JSON.stringify(e) };
  }
  return { status: "running" };
}
