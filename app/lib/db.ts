import "server-only";
import { createHash } from "node:crypto";
import type { Chart } from "./astro";
import frozen from "./frozen.json";

// The party is over and its database is gone: every traveler, orbit, pass and signed-in phone as they stood
// when Supabase was frozen (scripts/freeze.ts wrote lib/frozen.json; the pictures are in public/app/kin/).
// Read-only: nothing new is saved, so nobody registers, collects or edits any more.

export type Player = {
  id: string;
  card_no: number;
  name: string;
  sign: string;
  element: string;
  character: string;
  subject: string;
  style: string;
  rarity: Rarity;
  status: "done" | "failed"; // failed: the Kin was never drawn
  image_url: string | null; // /app/kin/<card number>.webp
  video_url: string | null; // the H3 clip, on varg's CDN
  prophecy: string | null;
  bio: string | null;
  ask_me: string | null;
  links: Links;
  chart: Chart; // the birthday sky (lib/astro.ts), worked out before the birthday was left behind
  cusp: "early" | "middle" | "late"; // where in the Sun sign the birthday falls
  scans: number; // pass taps that collected or re-collected someone
  created_at: string;
};

// Profile links, stored as full http(s) URLs (see lib/profile.ts).
export type Links = Partial<Record<"instagram" | "telegram" | "x" | "linkedin" | "website", string>>;

// What a traveler chose to show on their card page. Everything is optional.
export type Profile = { bio: string | null; ask_me: string | null; links: Links };
export function toProfile(p: Partial<Player>): Profile {
  return { bio: p.bio ?? null, ask_me: p.ask_me ?? null, links: p.links ?? {} };
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

// What any viewer may see about a character. The rarity is kept for the share picture only.
export type PublicCard = {
  id: string;
  card_no: number;
  name: string;
  character: string;
  sign: string;
  element: string;
  style: string;
  status: Player["status"];
  image_url: string | null;
  video_url?: string | null; // the Kin's clip; only the big card plays it
  prophecy: string | null;
  collected_by?: number;
};

export function toCard(p: Player): PublicCard {
  return {
    id: p.id,
    card_no: p.card_no,
    name: p.name,
    character: p.character,
    sign: p.sign,
    element: p.element,
    style: p.style,
    status: p.status,
    image_url: p.image_url,
    video_url: p.video_url,
    prophecy: p.prophecy,
  };
}

type Snapshot = {
  frozen_at: string;
  scans: number;
  players: Player[];
  orbits: [collector: number, owner: number, at: string][];
  passes: Record<string, number>; // hash of a pass code -> card number
  sessions: Record<string, number>; // hash of a session cookie -> card number
};
const data = frozen as unknown as Snapshot;

export const FROZEN_AT = data.frozen_at;
export const SCANS = data.scans;
export const PLAYERS: readonly Player[] = data.players;

const byId = new Map(PLAYERS.map((p) => [p.id, p]));
const byCard = new Map(PLAYERS.map((p) => [p.card_no, p]));
export const playerByCard = (n: number | undefined): Player | null => (n == null ? null : byCard.get(n) ?? null);

// Who collected whom, oldest first.
export type Orbit = { collector: Player; owner: Player; at: string };
export const ORBITS: readonly Orbit[] = data.orbits.flatMap(([c, o, at]) => {
  const collector = byCard.get(c), owner = byCard.get(o);
  return collector && owner ? [{ collector, owner, at }] : [];
});

// Pass codes and session cookies are kept only as hashes (the repository is public): the same hash as scripts/freeze.ts.
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);
export const passOwner = (code: string) => playerByCard(data.passes[hash(code)]);
export const sessionOwner = (token: string) => playerByCard(data.sessions[hash(token)]);

// The URL written on each pass is /t/<code>.
export const TAG_RE = /^[A-Za-z0-9_-]{3,40}$/;
// A traveler's own link, /app/t/kin-<card number>: their QR code, and the way to them without the pass.
export const KIN_LINK = /^kin-(\d{1,6})$/;

export function getPlayer(id: string): Player | null {
  return byId.get(id) ?? null;
}

// A card by its share-link id: the card number (/c/7) or the player id (older links).
export function findPlayer(id: string): Player | null {
  return /^\d{1,6}$/.test(id) ? playerByCard(Number(id)) : getPlayer(id);
}
