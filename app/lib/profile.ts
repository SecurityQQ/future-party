import type { Links } from "./db";

// The optional profile travelers filled in during the party: the links it can hold.
export const LINKS: { key: keyof Links; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "telegram", label: "Telegram" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
];

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
