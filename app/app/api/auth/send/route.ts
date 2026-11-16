import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normEmail, validEmail } from "@/lib/profile";
import { CODE_TTL_MS, MAX_PER_HOUR, hashCode, newCode } from "@/lib/login";
import { devEcho, emailReady, loginEmail, sendEmail } from "@/lib/email";
import { LIMITS, LOST_LINK, MIN, recent } from "@/lib/limits";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Email login, step 1: { email } -> a six-digit code goes to that address.
export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const email = normEmail(body.email);
  if (!validEmail(email)) return fail("Enter the email you gave the Station.");
  if (!emailReady() && !devEcho()) return fail("Email login is not switched on yet. Scan your pass instead.", 503);

  const { data: player } = await db().from("players").select("id, name").eq("email", email).maybeSingle();
  if (!player) return fail("No traveler uses this email. Scan your pass to join, or add your email to your profile first.", 404);

  // Write the code first, then count the rows up to this one: parallel requests see each other,
  // the earliest go on and the rest are refused (taking their own code back out), so a double tap
  // still sends one code and a burst sends no more. The app-wide cap keeps a list of guest emails
  // from turning the Station into a mailer (lib/limits.ts).
  const code = newCode();
  const { data: row, error } = await db()
    .from("login_codes")
    .insert({
      player_id: player.id,
      email,
      code_hash: hashCode(email, code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !row) return fail("Could not create a code. Try again.", 500);
  const upTo = (q: any) => q.lte("id", row.id);
  const refused = await Promise.all([
    recent("login_codes", 60 * MIN, (q) => upTo(q).eq("email", email)),
    recent("login_codes", 30_000, (q) => q.lt("id", row.id).eq("email", email)),
    recent("login_codes", 10 * MIN, upTo),
  ]).then(
    ([hour, justBefore, everyone]) =>
      hour > MAX_PER_HOUR ? { error: "Too many codes this hour. Use the last one, or try again later.", status: 429 }
      : justBefore > 0 ? { error: "A code is on its way. Wait half a minute before asking again.", status: 429 }
      : everyone > LIMITS.codes10min ? { error: "The Station is sending a lot of codes right now. Try again in a few minutes.", status: 429 }
      : null,
    () => ({ error: LOST_LINK, status: 503 }),
  );
  if (refused) {
    await db().from("login_codes").delete().eq("id", row.id);
    return fail(refused.error, refused.status);
  }

  if (devEcho()) return NextResponse.json({ ok: true, devCode: code });
  const link = `${new URL(req.url).origin}/login?email=${encodeURIComponent(email)}&code=${code}`;
  try {
    await sendEmail({ to: email, ...loginEmail({ name: player.name, code, link }) });
  } catch (e: any) {
    console.error("login email", e?.message);
    return fail("The email did not go out. Try again in a minute.", 502);
  }
  return NextResponse.json({ ok: true });
}
