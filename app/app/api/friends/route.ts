import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { findPlayer } from "@/lib/character";

// "Become friends" on someone's card page: { id } (player id or card number). Mutual and instant.
// Friends are not collections: only scanning a pass counts on the ranking.
export async function POST(req: Request) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string | number };
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Scan your pass or log in first." }, { status: 401 });
  const other = id != null ? await findPlayer(String(id)) : null;
  if (!other) return NextResponse.json({ error: "No such traveler." }, { status: 404 });
  if (other.id === me.id) return NextResponse.json({ error: "That is you." }, { status: 400 });
  const { error } = await db()
    .from("friends")
    .upsert(
      [
        { player_id: me.id, friend_id: other.id },
        { player_id: other.id, friend_id: me.id },
      ],
      { onConflict: "player_id,friend_id", ignoreDuplicates: true },
    );
  if (error) return NextResponse.json({ error: "Could not connect. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
