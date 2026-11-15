import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isAdmin(key: unknown): boolean {
  const real = process.env.ADMIN_KEY;
  if (!real || typeof key !== "string" || key.length !== real.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(real));
}
