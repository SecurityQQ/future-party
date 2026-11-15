import "server-only";
import { CARD_FIELDS, db, type PublicCard, toCard } from "./db";

// One way to connect: the orbit. Tapping a pass or scanning a traveler's QR adds their Kin at once
// (collections). Without the pass at hand, you send an orbit request from their card page and they
// approve it; then each Kin joins the other's orbit.
//
// Requests live in the old `friends` table (no schema change): a row (player_id → friend_id) means
// "player_id asked friend_id". Before 2026-11-15 "Become friends" wrote a row each way; such pairs are
// read as approved and turned into orbit entries (settleLegacy).

export type OrbitState = "none" | "sent" | "incoming" | "orbit";

async function row(from: string, to: string): Promise<boolean> {
  const { data } = await db().from("friends").select("player_id").eq("player_id", from).eq("friend_id", to).maybeSingle();
  return !!data;
}

export async function inOrbit(me: string, other: string): Promise<boolean> {
  const { data } = await db().from("collections").select("owner_id").eq("collector_id", me).eq("owner_id", other).maybeSingle();
  return !!data;
}

export async function orbitState(me: string, other: string): Promise<OrbitState> {
  const [orbit, sent, incoming] = await Promise.all([inOrbit(me, other), row(me, other), row(other, me)]);
  if (orbit) return "orbit";
  if (sent && incoming) return "orbit"; // an old mutual friendship; settleLegacy turns it into orbit entries
  if (incoming) return "incoming";
  if (sent) return "sent";
  return "none";
}

// Each Kin joins the other's orbit, and the request rows between the two go away.
export async function connect(a: string, b: string, via = "request") {
  await db()
    .from("collections")
    .upsert(
      [
        { collector_id: a, owner_id: b, tag_code: via },
        { collector_id: b, owner_id: a, tag_code: via },
      ],
      { onConflict: "collector_id,owner_id", ignoreDuplicates: true },
    );
  await db().from("friends").delete().or(`and(player_id.eq.${a},friend_id.eq.${b}),and(player_id.eq.${b},friend_id.eq.${a})`);
}

// Requests waiting for this traveler's answer, newest first.
export async function incomingRequests(me: string): Promise<PublicCard[]> {
  const [{ data: inc }, { data: out }] = await Promise.all([
    db().from("friends").select(`created_at, from:players!friends_player_id_fkey(${CARD_FIELDS})`).eq("friend_id", me).order("created_at", { ascending: false }),
    db().from("friends").select("friend_id").eq("player_id", me),
  ]);
  const mine = new Set((out ?? []).map((r: any) => r.friend_id));
  return (inc ?? []).map((r: any) => r.from).filter((p: any) => p && !mine.has(p.id)).map((p: any) => toCard(p));
}

// Old mutual "friends" pairs of this traveler become orbit entries both ways.
export async function settleLegacy(me: string) {
  const [{ data: out }, { data: inc }] = await Promise.all([
    db().from("friends").select("friend_id").eq("player_id", me),
    db().from("friends").select("player_id").eq("friend_id", me),
  ]);
  const asked = new Set((out ?? []).map((r: any) => r.friend_id as string));
  for (const r of inc ?? []) if (asked.has(r.player_id)) await connect(me, r.player_id, "friends");
}
