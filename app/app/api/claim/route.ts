import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { KIN_LINK, recordScan, TAG_RE } from "@/lib/guests";

// Link an unclaimed card to the signed-in pilot (someone who registered by scanning another card first).
export async function POST(req: Request) {
  const { tag } = (await req.json().catch(() => ({}))) as { tag?: string };
  if (!tag || !TAG_RE.test(tag) || KIN_LINK.test(tag)) return NextResponse.json({ error: "Bad card code" }, { status: 400 });
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Register first" }, { status: 401 });
  const { data: mine } = await db().from("tags").select("code").eq("player_id", me.id).maybeSingle();
  if (mine) return NextResponse.json({ error: "You already have a card" }, { status: 409 });
  await db().from("tags").upsert({ code: tag }, { onConflict: "code", ignoreDuplicates: true });
  const { data } = await db()
    .from("tags")
    .update({ player_id: me.id, claimed_at: new Date().toISOString() })
    .eq("code", tag)
    .is("player_id", null)
    .select("code");
  if (!data?.length) return NextResponse.json({ error: "This card already has a traveler" }, { status: 409 });
  await recordScan(tag, me.id, "claim");
  return NextResponse.json({ ok: true });
}
