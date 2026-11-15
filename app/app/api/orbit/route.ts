import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { findPlayer } from "@/lib/character";
import { connect, orbitState } from "@/lib/orbit";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Orbit actions from a card page or the requests list. body: { id: player id or card number, action }
//   request  ask them to join orbits (if they already asked you, you are connected at once)
//   cancel   take your request back
//   approve  accept their request: each Kin joins the other's orbit
//   decline  drop their request
//   remove   take their Kin out of your orbit (yours stays in theirs)
// Answers { state } (lib/orbit.ts OrbitState).
export async function POST(req: Request) {
  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string | number; action?: string };
  const me = await currentPlayer();
  if (!me) return fail("Log in first.", 401);
  const other = id != null ? await findPlayer(String(id)) : null;
  if (!other) return fail("No such traveler.", 404);
  if (other.id === me.id) return fail("That is you.");
  const state = await orbitState(me.id, other.id);

  switch (action) {
    case "request":
      if (state === "incoming" || state === "orbit") {
        if (state === "incoming") await connect(me.id, other.id);
        return NextResponse.json({ state: "orbit", connected: state === "incoming" });
      }
      await db().from("friends").upsert({ player_id: me.id, friend_id: other.id }, { onConflict: "player_id,friend_id", ignoreDuplicates: true });
      return NextResponse.json({ state: "sent" });
    case "cancel":
      await db().from("friends").delete().eq("player_id", me.id).eq("friend_id", other.id);
      return NextResponse.json({ state: state === "sent" ? "none" : state });
    case "approve":
      if (state !== "incoming") return NextResponse.json({ state });
      await connect(me.id, other.id);
      return NextResponse.json({ state: "orbit", connected: true });
    case "decline":
      await db().from("friends").delete().eq("player_id", other.id).eq("friend_id", me.id);
      return NextResponse.json({ state: state === "incoming" ? "none" : state });
    case "remove":
      await db().from("collections").delete().eq("collector_id", me.id).eq("owner_id", other.id);
      await db().from("friends").delete().or(`and(player_id.eq.${me.id},friend_id.eq.${other.id}),and(player_id.eq.${other.id},friend_id.eq.${me.id})`);
      return NextResponse.json({ state: "none" });
    default:
      return fail("Unknown action.");
  }
}
