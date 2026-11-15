import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normEmail, validEmail } from "@/lib/profile";
import { CODE_TTL_MS, MAX_PER_HOUR, hashCode, newCode } from "@/lib/login";
import { devEcho, emailReady, loginEmail, sendEmail } from "@/lib/email";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Email login, step 1: { email } -> a six-digit code goes to that address.
export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const email = normEmail(body.email);
  if (!validEmail(email)) return fail("Enter the email you gave the Station.");
  if (!emailReady() && !devEcho()) return fail("Email login is not switched on yet. Scan your pass instead.", 503);

  const { data: player } = await db().from("players").select("id, name").eq("email", email).maybeSingle();
  if (!player) return fail("No traveler uses this email. Scan your pass to join, or add your email to your profile first.", 404);

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { data: recent } = await db()
    .from("login_codes")
    .select("created_at")
    .eq("email", email)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false });
  if ((recent?.length ?? 0) >= MAX_PER_HOUR) return fail("Too many codes this hour. Use the last one, or try again later.", 429);
  if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < 30_000) return fail("A code is on its way. Wait half a minute before asking again.", 429);

  const code = newCode();
  const { error } = await db().from("login_codes").insert({
    player_id: player.id,
    email,
    code_hash: hashCode(email, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) return fail("Could not create a code. Try again.", 500);

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
