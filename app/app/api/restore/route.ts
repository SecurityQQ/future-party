import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/session";
import { KIN_LINK, TAG_RE } from "@/lib/guests";
import { validBirthday } from "@/lib/zodiac";
import { LIMITS, LOST_LINK, MIN, recent } from "@/lib/limits";

const TRIES_PER_PASS = 5; // in any ten minutes

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// "This is my card": on a new phone, the card's owner proves it with their birthday.
export async function POST(req: Request) {
  const { tag, birthday } = (await req.json().catch(() => ({}))) as { tag?: string; birthday?: string };
  if (!tag || !TAG_RE.test(tag) || KIN_LINK.test(tag) || !validBirthday(birthday)) return fail("Enter your date of birth", 400);

  // A birthday is a small secret, so guesses are counted: the try is written first (as a failure
  // until it proves right), then the tries up to this one are counted, so parallel guesses see
  // each other and only the first five per pass in ten minutes are checked. App-wide, wrong
  // birthdays across every pass are capped too, against someone guessing on many passes at once.
  // A refused try takes its row back out, so hammering cannot fill the scans table.
  const { data: attempt, error } = await db().from("scans").insert({ tag_code: tag, player_id: null, kind: "restore-fail" }).select("id").single();
  if (!attempt) {
    console.error("restore: record try", error?.message);
    return fail("The Station could not check that. Try again.", 500);
  }
  const upTo = (q: any) => q.eq("kind", "restore-fail").lte("id", attempt.id);
  const refused = await Promise.all([
    recent("scans", 10 * MIN, (q) => upTo(q).eq("tag_code", tag)),
    recent("scans", 10 * MIN, upTo),
  ]).then(
    ([onPass, everywhere]) =>
      onPass > TRIES_PER_PASS ? { error: "Too many tries. Wait ten minutes.", status: 429 }
      : everywhere > LIMITS.restoreFails10min ? { error: "The Station is checking a lot of passes right now. Try again in a few minutes.", status: 429 }
      : null,
    () => ({ error: LOST_LINK, status: 503 }),
  );
  if (refused) {
    await db().from("scans").delete().eq("id", attempt.id);
    return fail(refused.error, refused.status);
  }

  const { data: t } = await db().from("tags").select("player:players(id, birthday)").eq("code", tag).maybeSingle();
  const owner = (t as any)?.player as { id: string; birthday: string } | null;
  if (!owner || owner.birthday !== birthday) return fail("The stars do not recognize that date.", 403);

  await db().from("scans").update({ kind: "restore", player_id: owner.id }).eq("id", attempt.id);
  await startSession(owner.id);
  return NextResponse.json({ ok: true });
}
