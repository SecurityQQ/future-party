import "server-only";
import { CARD_FIELDS, db, type Player, type PublicCard, toCard } from "./db";

export type Ranger = {
  id: string; card_no: number; name: string; character: string; sign: string; element: string;
  style: string; status: Player["status"]; image_url: string | null;
  collected: number; scans: number; collected_by: number; last_collect_at: string | null;
};

export async function leaderboard(): Promise<Ranger[]> {
  const { data, error } = await db().from("leaderboard").select("*").limit(500);
  if (error) throw new Error(`leaderboard: ${error.message}`);
  return ((data ?? []) as Ranger[]).sort(
    (a, b) => b.collected - a.collected || (a.last_collect_at ?? "9").localeCompare(b.last_collect_at ?? "9") || a.card_no - b.card_no,
  );
}

export async function collectedBy(id: string): Promise<number> {
  const { count } = await db().from("collections").select("owner_id", { count: "exact", head: true }).eq("owner_id", id);
  return count ?? 0;
}

export async function cardOf(p: Player): Promise<PublicCard> {
  return { ...toCard(p), collected_by: await collectedBy(p.id) };
}

// The cards this player has collected, newest first.
export async function holdOf(id: string): Promise<PublicCard[]> {
  const { data } = await db()
    .from("collections")
    .select(`created_at, owner:players!collections_owner_id_fkey(${CARD_FIELDS})`)
    .eq("collector_id", id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => toCard(r.owner));
}

export async function totals() {
  const [players, collections, scans] = await Promise.all([
    db().from("players").select("id", { count: "exact", head: true }),
    db().from("collections").select("owner_id", { count: "exact", head: true }),
    db().from("scans").select("id", { count: "exact", head: true }),
  ]);
  return { players: players.count ?? 0, collections: collections.count ?? 0, scans: scans.count ?? 0 };
}

export async function hasTag(id: string): Promise<boolean> {
  const { data } = await db().from("tags").select("code").eq("player_id", id).maybeSingle();
  return !!data;
}

// The code in a traveler's QR: their pass, or their Kin link when they have no pass (see passUrl).
export async function passCodeOf(p: Pick<Player, "id" | "card_no">): Promise<string> {
  const { data } = await db().from("tags").select("code").eq("player_id", p.id).maybeSingle();
  return data?.code ?? `kin-${p.card_no}`;
}

// Everyone in the traveler's orbit, either way (collections), plus old mutual "friends" pairs (since PR #56 a
// one-way friends row is only a pending orbit request, so it does not count). Whole rows (with birthdays)
// for the server's pair arithmetic only; never send them to the browser as is.
export async function circleOf(id: string): Promise<Player[]> {
  const [out, inc, mine, theirs] = await Promise.all([
    db().from("friends").select("friend_id").eq("player_id", id),
    db().from("friends").select("player_id").eq("friend_id", id),
    db().from("collections").select("owner_id").eq("collector_id", id),
    db().from("collections").select("collector_id").eq("owner_id", id),
  ]);
  const asked = new Set((out.data ?? []).map((r: any) => r.friend_id as string));
  const ids = new Set<string>([
    ...(inc.data ?? []).map((r: any) => r.player_id as string).filter((x) => asked.has(x)),
    ...(mine.data ?? []).map((r: any) => r.owner_id),
    ...(theirs.data ?? []).map((r: any) => r.collector_id),
  ]);
  ids.delete(id);
  if (!ids.size) return [];
  const { data } = await db().from("players").select("*").in("id", [...ids]);
  return (data ?? []) as Player[];
}
