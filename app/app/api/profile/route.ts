import { NextResponse } from "next/server";
import { db, type Links } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { ASK_MAX, BIO_MAX, LINKS, normEmail, normalizeLink, validEmail } from "@/lib/profile";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

// Save the optional profile: { name, email, bio, ask_me, links: { instagram, telegram, x, linkedin, website } }.
export async function POST(req: Request) {
  const me = await currentPlayer();
  if (!me) return fail("Scan your pass or log in first.", 401);
  const body: any = await req.json().catch(() => ({}));

  const name = clean(body.name, 60);
  if (name.length < 2) return fail("Your name needs at least two letters.");

  const email = normEmail(body.email);
  if (email && !validEmail(email)) return fail("That email does not look right.");
  if (email && email !== me.email) {
    const { data: taken } = await db().from("players").select("id").eq("email", email).neq("id", me.id).maybeSingle();
    if (taken) return fail("Another traveler already uses this email.", 409);
  }

  const links: Links = {};
  for (const l of LINKS) {
    const raw = typeof body.links?.[l.key] === "string" ? body.links[l.key] : "";
    if (!raw.trim()) continue;
    const url = normalizeLink(l.key, raw);
    if (!url) return fail(`The ${l.label} link does not look right.`);
    links[l.key] = url;
  }

  const { error } = await db()
    .from("players")
    .update({
      name,
      email: email || null,
      bio: clean(body.bio, BIO_MAX) || null,
      ask_me: clean(body.ask_me, ASK_MAX) || null,
      links,
      updated_at: new Date().toISOString(),
    })
    .eq("id", me.id);
  if (error) return fail(error.code === "23505" ? "Another traveler already uses this email." : "Could not save. Try again.", error.code === "23505" ? 409 : 500);
  return NextResponse.json({ ok: true });
}
