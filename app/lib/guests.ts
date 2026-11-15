import "server-only";
import { db, type Guest } from "./db";

export async function loadGuests(): Promise<Guest[]> {
  const { data, error } = await db()
    .from("guests")
    .select("id, rsvp, name, hint, aliases, role, character, subject, scene, tone, topics");
  if (error) throw new Error(`guests: ${error.message}`);
  return (data ?? []) as Guest[];
}

export async function getGuest(id: number | null): Promise<Guest | null> {
  if (id == null) return null;
  const { data } = await db()
    .from("guests")
    .select("id, rsvp, name, hint, aliases, role, character, subject, scene, tone, topics")
    .eq("id", id)
    .maybeSingle();
  return (data as Guest) ?? null;
}

// Guests that already have a character (ranked lower when matching a new name).
export async function takenGuestIds(): Promise<Set<number>> {
  const { data } = await db().from("players").select("guest_id").not("guest_id", "is", null);
  return new Set((data ?? []).map((r: any) => r.guest_id as number));
}

export const TAG_RE = /^[A-Za-z0-9_-]{3,40}$/;
// A traveler's own link for when they have no pass: /app/t/kin-<card number>. It is never a row in tags,
// so it can't be claimed; it always means "this traveler", like their pass once it is bound.
export const KIN_LINK = /^kin-(\d{1,6})$/;

export async function recordScan(tag: string, playerId: string | null, kind: string) {
  await db().from("scans").insert({ tag_code: tag, player_id: playerId, kind });
}
