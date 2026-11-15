import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/character";
import { getGuest } from "@/lib/guests";
import { fableFor } from "@/lib/fable";

export const maxDuration = 60;

// Fable's reading of one traveler (player id or card number): { text }. Public, like the card itself;
// written once per traveler and kept (lib/fable.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await findPlayer((await params).id);
  if (!p) return NextResponse.json({ error: "No such traveler." }, { status: 404 });
  const { text, kept } = await fableFor(p, await getGuest(p.guest_id));
  return NextResponse.json({ text }, { headers: { "Cache-Control": kept ? "public, max-age=300" : "no-store" } });
}
