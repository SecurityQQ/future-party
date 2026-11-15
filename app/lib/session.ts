import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db, type Player } from "./db";

export const SESSION_COOKIE = "zr_session";
const YEAR = 60 * 60 * 24 * 365;

// The player this device is signed in as, from the httpOnly session cookie.
export async function currentPlayer(): Promise<Player | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  const { data } = await db().from("sessions").select("player:players(*)").eq("token", token).maybeSingle();
  return ((data as any)?.player as Player) ?? null;
}

// Bind this device to a player: a new random token in the DB and in a cookie.
export async function startSession(playerId: string) {
  const token = randomBytes(24).toString("base64url");
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { error } = await db().from("sessions").insert({ token, player_id: playerId, user_agent: ua });
  if (error) throw new Error(`session: ${error.message}`);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
}

// Sign this device out: drop its session row and the cookie.
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().from("sessions").delete().eq("token", token);
  jar.delete(SESSION_COOKIE);
}
