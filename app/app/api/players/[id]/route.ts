import { NextResponse } from "next/server";
import { toCard } from "@/lib/db";
import { refresh } from "@/lib/character";
import { currentPlayer } from "@/lib/session";

// Status of one character; each call also moves its image job forward.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await refresh(id);
  if (!p) return NextResponse.json({ error: "No such character" }, { status: 404 });
  const me = await currentPlayer();
  const own = me?.id === p.id;
  return NextResponse.json(
    { ...toCard(p), own, error: own && p.status === "failed" ? p.error : null, ...(own ? { redraws: p.redraws, has_prev: !!p.prev_image_url } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
