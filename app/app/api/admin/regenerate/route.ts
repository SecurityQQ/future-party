import { NextResponse, after } from "next/server";
import { getPlayer, pollUntilSettled, regenerate } from "@/lib/character";
import { getGuest } from "@/lib/guests";
import { isAdmin } from "@/lib/admin";

export const maxDuration = 300;

// Admin: redraw a character. { key, playerId, reroll?: true for a new finish }
export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  if (!isAdmin(body.key)) return NextResponse.json({ error: "Wrong key" }, { status: 403 });
  const p = await getPlayer(String(body.playerId || ""));
  if (!p) return NextResponse.json({ error: "No such player" }, { status: 404 });
  const next = await regenerate(p, await getGuest(p.guest_id), !!body.reroll);
  after(() => pollUntilSettled(p.id));
  return NextResponse.json({ status: next.status, style: next.style });
}
