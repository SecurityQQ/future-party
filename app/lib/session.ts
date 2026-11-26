import "server-only";
import { cookies } from "next/headers";
import { sessionOwner, type Player } from "./db";

export const SESSION_COOKIE = "zr_session";

// The player this device is signed in as, from the httpOnly session cookie it got at the party.
// No new sessions start: the party is over, so a phone keeps the traveler it had on the night.
export async function currentPlayer(): Promise<Player | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  return sessionOwner(token);
}

// Sign this device out for good.
export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
