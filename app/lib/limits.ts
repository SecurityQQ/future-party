import "server-only";
import { db } from "./db";

// App-wide caps against abuse. They hold however many addresses an attacker uses, so they guard
// what costs money or opens accounts: new travelers (each one is a paid picture and a ~30¢ clip),
// login emails, and birthday guesses on passes. They count rows the app already writes, so they
// need no table of their own. Limits per address live in the Vercel Firewall in front of the app
// (README, "Rate limits"). Sized for a party of about 50 guests; raise one with its env var on
// Vercel (and redeploy) if the night needs more.
const num = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const LIMITS = {
  register10min: num("LIMIT_REGISTER_10MIN", 30), // new travelers in any 10 minutes (a door rush)
  registerDay: num("LIMIT_REGISTER_DAY", 150), // new travelers in any 24 hours
  codes10min: num("LIMIT_LOGIN_CODES_10MIN", 60), // login emails in any 10 minutes, every address together
  restoreFails10min: num("LIMIT_RESTORE_FAILS_10MIN", 40), // wrong birthdays in any 10 minutes, every pass together
};

export const MIN = 60_000;
export const since = (ms: number) => new Date(Date.now() - ms).toISOString();

// What a guest reads when a count could not be made. Limits fail closed: a count that errors
// refuses the request, or an attacker who can make the database stumble would get past them.
export const LOST_LINK = "The Station lost its link for a moment. Try again.";

// Rows created in the last `ms` milliseconds, with optional extra filters. Throws when the
// database does not answer with a count (see LOST_LINK).
export async function recent(
  table: "players" | "login_codes" | "scans",
  ms: number,
  where: (q: any) => any = (q) => q,
): Promise<number> {
  const { count, error } = await where(
    db().from(table).select("id", { count: "exact", head: true }).gte("created_at", since(ms)),
  );
  if (error || count == null) {
    console.error(`limits: count ${table}`, error?.message ?? "no count");
    throw new Error(`limits: count ${table} failed`);
  }
  return count;
}

// Why the Station cannot take a new traveler right now (with the HTTP status), or null when it can.
export async function registerBlocked(): Promise<{ error: string; status: number } | null> {
  let tenMin: number, day: number;
  try {
    [tenMin, day] = await Promise.all([recent("players", 10 * MIN), recent("players", 24 * 60 * MIN)]);
  } catch {
    return { error: LOST_LINK, status: 503 };
  }
  if (day >= LIMITS.registerDay) return { error: "The Station has welcomed all the travelers it can today. Find the host to get in.", status: 429 };
  if (tenMin >= LIMITS.register10min) return { error: "The Station is drawing a lot of Kin right now. Try again in a few minutes.", status: 429 };
  return null;
}
