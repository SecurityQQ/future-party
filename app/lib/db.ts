import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side client with the secret key. It bypasses row level security, so it must never
// reach the browser ("server-only" makes a client import fail the build).
let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type Guest = {
  id: number;
  rsvp: number | null;
  name: string;
  hint: string | null;
  aliases: string[];
  role: string;
  character: string | null;
  subject: string | null;
  scene: string | null;
  tone: string;
  topics: string[];
};

export type Player = {
  id: string;
  card_no: number;
  name: string;
  birthday: string;
  sign: string;
  element: string;
  guest_id: number | null;
  match_score: number | null;
  character: string;
  subject: string;
  scene: string | null;
  style: string;
  rarity: Rarity;
  prompt: string | null;
  model: string | null;
  job_id: string | null;
  attempts: number;
  status: "pending" | "generating" | "finalizing" | "done" | "failed";
  error: string | null;
  image_url: string | null;
  source_url: string | null;
  reading: string | null;
  prophecy: string | null;
  email: string | null;
  bio: string | null;
  ask_me: string | null;
  links: Links | null;
  redraws: number;
  feedback: string | null;
  prev_image_url: string | null;
  video_url: string | null; // the H3 clip of the picture now on the card (lib/video.ts)
  created_at: string;
  updated_at: string;
};

// Profile links, stored as full http(s) URLs (see lib/profile.ts).
export type Links = Partial<Record<"instagram" | "telegram" | "x" | "linkedin" | "website", string>>;

// What a traveler chose to show on their card page. Everything is optional.
export type Profile = { bio: string | null; ask_me: string | null; links: Links };
export function toProfile(p: Partial<Player>): Profile {
  return { bio: p.bio ?? null, ask_me: p.ask_me ?? null, links: (p.links as Links) ?? {} };
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

// What any viewer may see about a character (no birthday, no prompt, no email). The rarity column
// still exists in the database, but the app no longer shows it.
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

export const CARD_FIELDS = "id, card_no, name, character, sign, element, style, status, image_url, prophecy";

export function toCard(p: Partial<Player> & Pick<Player, "id">): PublicCard {
  return {
    id: p.id,
    card_no: p.card_no!,
    name: p.name!,
    character: p.character!,
    sign: p.sign!,
    element: p.element!,
    style: p.style!,
    status: p.status!,
    image_url: p.image_url ?? null,
    video_url: p.video_url ?? null,
    prophecy: p.prophecy ?? null,
  };
}
