import { NextResponse, after } from "next/server";
import { getPlayer, pollUntilSettled, regenerate } from "@/lib/character";
import { getGuest } from "@/lib/guests";
import { currentPlayer } from "@/lib/session";

export const maxDuration = 300;

// The owner may retry a character whose image failed every attempt (same finish).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentPlayer();
  const p = await getPlayer(id);
  if (!p || me?.id !== p.id) return NextResponse.json({ error: "Not your character" }, { status: 403 });
  if (p.status !== "failed") return NextResponse.json({ status: p.status });
  const next = await regenerate(p, await getGuest(p.guest_id));
  after(() => pollUntilSettled(p.id));
  return NextResponse.json({ status: next.status });
}
