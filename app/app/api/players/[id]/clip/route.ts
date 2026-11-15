import { getPlayer } from "@/lib/character";

export const maxDuration = 60;

// Save video: the Kin's clip as a download. Clips live on varg's CDN, which cannot be asked for a
// download (Supabase can, with ?download=), so this streams the card's own clip through with an
// attachment header. Only the clip recorded for this card, only from varg's CDN or our Supabase,
// so it is no open proxy.
const HOSTS = new Set(["s3.varg.ai", new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.local").host]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPlayer(id);
  const src = p?.video_url ? new URL(p.video_url) : null;
  if (!p || !src || src.protocol !== "https:" || !HOSTS.has(src.host)) return new Response("No clip for this Kin yet.", { status: 404 });

  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok || !res.body) return new Response("The clip could not be fetched. Try again.", { status: 502 });

  const name = `${p.character}-${String(p.card_no).padStart(3, "0")}`.replace(/[^\p{L}\p{N}]+/gu, "-") + ".mp4";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "public, max-age=3600",
  });
  const length = res.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(res.body, { headers });
}
