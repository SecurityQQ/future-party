import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { pairFable } from "@/lib/fable";
import { pickLang } from "@/lib/i18n";

export const maxDuration = 60;

// Fable reads you and another traveler (player id or card number) in ?lang=: { score, key, text }.
// Only for a signed-in traveler, about themselves and someone else; the score is arithmetic, the words Fable's.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const other = findPlayer((await params).id);
  if (!other) return NextResponse.json({ error: "No such traveler." }, { status: 404 });
  if (other.id === me.id) return NextResponse.json({ error: "That is you." }, { status: 400 });
  const lang = pickLang(new URL(req.url).searchParams.get("lang"));
  const { pair, text, kept } = await pairFable(me, other, lang);
  return NextResponse.json({ score: pair.score, key: pair.key, text }, { headers: { "Cache-Control": kept ? "private, max-age=300" : "no-store" } });
}
