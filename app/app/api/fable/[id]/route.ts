import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/db";
import { fableFor } from "@/lib/fable";
import { pickLang } from "@/lib/i18n";

export const maxDuration = 60;

// Fable's reading of one traveler (player id or card number) in ?lang= (en ru es zh ja de): { text }.
// Public, like the card itself; written once per traveler and language and kept in memory (lib/fable.ts).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = findPlayer((await params).id);
  if (!p) return NextResponse.json({ error: "No such traveler." }, { status: 404 });
  const lang = pickLang(new URL(req.url).searchParams.get("lang"));
  const { text, kept } = await fableFor(p, lang);
  return NextResponse.json({ text }, { headers: { "Cache-Control": kept ? "public, max-age=300" : "no-store" } });
}
