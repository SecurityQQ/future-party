import type { Links } from "./db";

// The optional profile a traveler can fill in. Shared by the form (client) and the API (server).
export const BIO_MAX = 160;
export const ASK_MAX = 80;

export const LINKS: { key: keyof Links; label: string; prefix: string; hint: string }[] = [
  { key: "instagram", label: "Instagram", prefix: "https://instagram.com/", hint: "@handle" },
  { key: "telegram", label: "Telegram", prefix: "https://t.me/", hint: "@handle" },
  { key: "x", label: "X", prefix: "https://x.com/", hint: "@handle" },
  { key: "linkedin", label: "LinkedIn", prefix: "https://www.linkedin.com/in/", hint: "name or link" },
  { key: "website", label: "Website", prefix: "https://", hint: "yoursite.com" },
];

// "@ann", "ann" or a full link -> a full http(s) URL, or null when it cannot be one.
export function normalizeLink(key: keyof Links, raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > 200) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
    } catch {
      return null;
    }
  }
  if (key === "website") return normalizeLink(key, `https://${v}`);
  const handle = v.replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "");
  if (!handle) return null;
  return LINKS.find((l) => l.key === key)!.prefix + handle;
}

// What a link shows on the card page: "@ann" for a handle, the host for a website.
export function linkText(key: keyof Links, url: string): string {
  try {
    const u = new URL(url);
    if (key === "website") return u.host.replace(/^www\./, "");
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? `@${last}` : u.host;
  } catch {
    return url;
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function normEmail(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}
export function validEmail(e: string): boolean {
  return e.length <= 120 && EMAIL_RE.test(e);
}
