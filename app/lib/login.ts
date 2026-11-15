import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// One-time login codes: six digits, 15 minutes, 5 tries each. Only a keyed hash is stored.
export const CODE_TTL_MS = 15 * 60_000;
export const MAX_TRIES = 5;
export const MAX_PER_HOUR = 5;

const pepper = () => process.env.LOGIN_PEPPER || process.env.SUPABASE_SECRET_KEY || "zodiac-rangers";

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(email: string, code: string): string {
  return createHmac("sha256", pepper()).update(`${email}:${code}`).digest("hex");
}

export function codeMatches(email: string, code: string, hash: string): boolean {
  const a = Buffer.from(hashCode(email, code), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
