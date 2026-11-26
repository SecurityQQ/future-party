import "server-only";
import { ORBITS, PLAYERS, SCANS, type Player, type PublicCard, toCard } from "./db";

export type Ranger = {
  id: string; card_no: number; name: string; character: string; sign: string; element: string;
  style: string; status: Player["status"]; image_url: string | null;
  collected: number; scans: number; collected_by: number; last_collect_at: string | null;
};

const collected = new Map<string, number>();
const lastAt = new Map<string, string>();
const collectedByMap = new Map<string, number>();
for (const o of ORBITS) {
  collected.set(o.collector.id, (collected.get(o.collector.id) ?? 0) + 1);
  lastAt.set(o.collector.id, o.at); // ORBITS is oldest first
  collectedByMap.set(o.owner.id, (collectedByMap.get(o.owner.id) ?? 0) + 1);
}

// The final ranking: most Kin collected, then whoever got there first.
const BOARD: Ranger[] = PLAYERS.map((p) => ({
  id: p.id, card_no: p.card_no, name: p.name, character: p.character, sign: p.sign, element: p.element,
  style: p.style, status: p.status, image_url: p.image_url,
  collected: collected.get(p.id) ?? 0, scans: p.scans, collected_by: collectedByMap.get(p.id) ?? 0, last_collect_at: lastAt.get(p.id) ?? null,
})).sort((a, b) => b.collected - a.collected || (a.last_collect_at ?? "9").localeCompare(b.last_collect_at ?? "9") || a.card_no - b.card_no);

export function leaderboard(): Ranger[] {
  return BOARD;
}

export function collectedBy(id: string): number {
  return collectedByMap.get(id) ?? 0;
}

export function cardOf(p: Player): PublicCard {
  return { ...toCard(p), collected_by: collectedBy(p.id) };
}

// The cards this player has collected, newest first.
export function holdOf(id: string): PublicCard[] {
  return ORBITS.filter((o) => o.collector.id === id).reverse().map((o) => toCard(o.owner));
}

export function inOrbit(me: string, other: string): boolean {
  return ORBITS.some((o) => o.collector.id === me && o.owner.id === other);
}

export function totals() {
  return { players: PLAYERS.length, collections: ORBITS.length, scans: SCANS };
}

// Everyone in the traveler's orbit, either way. Whole rows for the server's pair arithmetic only.
export function circleOf(id: string): Player[] {
  const ids = new Set<string>();
  for (const o of ORBITS) {
    if (o.collector.id === id) ids.add(o.owner.id);
    if (o.owner.id === id) ids.add(o.collector.id);
  }
  ids.delete(id);
  return PLAYERS.filter((p) => ids.has(p.id));
}
