import { NextResponse, after } from "next/server";
import { db, type Guest, type Player } from "@/lib/db";
import { currentPlayer, startSession } from "@/lib/session";
import { validBirthday } from "@/lib/zodiac";
import { decide, rankGuests } from "@/lib/match";
import { KIN_LINK, loadGuests, recordScan, TAG_RE, takenGuestIds } from "@/lib/guests";
import { planCharacter, pollUntilSettled, startGeneration } from "@/lib/character";
import { normEmail, validEmail } from "@/lib/profile";
import { emailReady, sendEmail, welcomeEmail } from "@/lib/email";
import { aiPaused } from "@/lib/paused";
import { registerBlocked } from "@/lib/limits";

export const maxDuration = 300;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Register a pilot: name + birthday -> closest guest -> character plan -> image job.
// body: { name, birthday, email?, tag?: card to claim, from?: card to collect, guestId?: number | "none" }
export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const birthday = body.birthday;
  const tag = typeof body.tag === "string" && TAG_RE.test(body.tag) && !KIN_LINK.test(body.tag) ? body.tag : null;
  const from = typeof body.from === "string" && TAG_RE.test(body.from) ? body.from : null;
  if (name.length < 2) return fail("The Station needs your name, traveler.");
  if (!validBirthday(birthday)) return fail("Enter your full date of birth.");
  // Optional: the email lets the traveler log back in with a code on any phone.
  const email = normEmail(body.email);
  if (email && !validEmail(email)) return fail("That email does not look right.");

  const me = await currentPlayer();
  if (me) return NextResponse.json({ playerId: me.id, already: true });
  if (aiPaused()) return fail("The Arrival Station has closed its gates. Travelers already with us can still log in and revisit their Kin.", 503);

  // Every new traveler is a paid picture and clip (and maybe a welcome email), and this needs no
  // login, so the whole app takes only so many per hour and per day (lib/limits.ts).
  const blocked = await registerBlocked();
  if (blocked) return fail(blocked.error, blocked.status);

  if (tag) {
    const { data: t } = await db().from("tags").select("player_id").eq("code", tag).maybeSingle();
    if (t?.player_id) return fail("This card already has a traveler.", 409);
  }
  if (email) {
    const { data: taken } = await db().from("players").select("id").eq("email", email).maybeSingle();
    if (taken) return NextResponse.json({ error: "A traveler already uses this email. Log in with it instead.", login: true }, { status: 409 });
  }

  // Who is this, according to the guest list?
  const guests = await loadGuests();
  let guest: Guest | null = null;
  let score: number | null = null;
  if (typeof body.guestId === "number") {
    guest = guests.find((g) => g.id === body.guestId) ?? null;
    score = guest ? rankGuests(name, [guest], new Set())[0].score : null;
  } else if (body.guestId !== "none") {
    const d = decide(rankGuests(name, guests, await takenGuestIds()));
    if (d.kind === "choose")
      return NextResponse.json({
        choose: d.options.map((o) => ({ id: o.guest.id, name: o.guest.name, hint: o.guest.hint, taken: o.taken })),
      });
    if (d.kind === "auto") {
      guest = d.pick.guest;
      score = d.pick.score;
    }
  }

  const plan = planCharacter(birthday, guest);
  const { data: created, error } = await db()
    .from("players")
    .insert({ name, birthday, email: email || null, guest_id: guest?.id ?? null, match_score: score, ...plan, status: "pending" })
    .select("*")
    .single();
  if (error || !created) return fail(`Could not register: ${error?.message}`, 500);
  const player = created as Player;

  if (tag) {
    await db().from("tags").upsert({ code: tag }, { onConflict: "code", ignoreDuplicates: true });
    const { data: claimed } = await db()
      .from("tags")
      .update({ player_id: player.id, claimed_at: new Date().toISOString() })
      .eq("code", tag)
      .is("player_id", null)
      .select("code");
    await recordScan(tag, player.id, claimed?.length ? "claim" : "busy");
  }
  if (from) {
    // A pass, or a traveler's Kin link (/app/t/kin-<card number>, the QR on their phone).
    const kin = from.match(KIN_LINK);
    const { data: t } = kin
      ? await db().from("players").select("player_id:id").eq("card_no", Number(kin[1])).maybeSingle()
      : await db().from("tags").select("player_id").eq("code", from).maybeSingle();
    if (t?.player_id && t.player_id !== player.id) {
      await db().from("collections").upsert({ collector_id: player.id, owner_id: t.player_id, tag_code: from }, { ignoreDuplicates: true });
      await recordScan(from, player.id, "collect");
    }
  }

  await startSession(player.id);
  await startGeneration(player);
  after(() => pollUntilSettled(player.id));
  if (email && emailReady()) {
    const origin = new URL(req.url).origin;
    after(() =>
      sendEmail({ to: email, ...welcomeEmail({ name, loginUrl: `${origin}/app/login`, cardUrl: `${origin}/app/c/${player.card_no}` }) }).catch((e) =>
        console.error("welcome email", e?.message),
      ),
    );
  }
  return NextResponse.json({ playerId: player.id, guest: guest ? guest.name : null });
}
