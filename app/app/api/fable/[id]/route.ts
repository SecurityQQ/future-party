import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/character";
import { getGuest } from "@/lib/guests";
import { fableFor } from "@/lib/fable";
import { pickLang } from "@/lib/i18n";

export const maxDuration = 60;

// Fable's reading of one traveler (player id or card number) in ?lang= (en ru es zh ja de): { text }.
// Public, like the card itself; written once per traveler and language and kept (lib/fable.ts).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await findPlayer((await params).id);
  if (!p) return NextResponse.json({ error: "No such traveler." }, { status: 404 });
  const lang = pickLang(new URL(req.url).searchParams.get("lang"));
  const { text, kept } = await fableFor(p, await getGuest(p.guest_id), lang);
  return NextResponse.json({ text }, { headers: { "Cache-Control": kept ? "public, max-age=300" : "no-store" } });
}
