import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { getGuest } from "@/lib/guests";
import { prophecyOf, streamReading } from "@/lib/reading";

export const maxDuration = 60;

// The oracles' reading for the signed-in pilot, streamed as plain text. Generated once, then stored.
export async function POST() {
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "No traveler on this device" }, { status: 401 });
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };
  if (me.reading) return new Response(me.reading, { headers });
  const guest = await getGuest(me.guest_id);
  const stream = streamReading(me, guest, async (text) => {
    await db().from("players").update({ reading: text, prophecy: prophecyOf(text) }).eq("id", me.id).is("reading", null);
  });
  return new Response(stream, { headers });
}
