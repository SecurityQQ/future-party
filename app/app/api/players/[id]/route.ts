import { NextResponse, after } from "next/server";
import { toCard } from "@/lib/db";
import { refresh } from "@/lib/character";
import { advanceClip, clipStatus } from "@/lib/video";
import { currentPlayer } from "@/lib/session";

export const maxDuration = 300;

// Status of one character; each call also moves its image job forward, and once the picture is
// done, its clip (after the response, so the reveal never waits for a video job to start).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await refresh(id);
  if (!p) return NextResponse.json({ error: "No such character" }, { status: 404 });
  const [me, video] = await Promise.all([currentPlayer(), clipStatus(p)]);
  const settled = video === "failed" || (video === "done" && !!p.video_url);
  if (p.status === "done" && !settled) after(() => advanceClip(p).then(() => {}, () => {}));
  const own = me?.id === p.id;
  return NextResponse.json(
    {
      ...toCard(p),
      video,
      own,
      error: own && p.status === "failed" ? p.error : null,
      ...(own ? { redraws: p.redraws, has_prev: !!p.prev_image_url } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
