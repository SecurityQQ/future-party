import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normEmail, validEmail } from "@/lib/profile";
import { MAX_TRIES, codeMatches } from "@/lib/login";
import { startSession } from "@/lib/session";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Email login, step 2: { email, code } -> this device is signed in as that traveler.
export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const email = normEmail(body.email);
  const code = String(body.code ?? "").replace(/\D/g, "");
  if (!validEmail(email) || code.length !== 6) return fail("Enter the six-digit code from the email.");

  const { data: row } = await db()
    .from("login_codes")
    .select("id, player_id, code_hash, attempts, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return fail("This code has expired. Send a new one.", 410);
  if (row.attempts >= MAX_TRIES) return fail("Too many wrong tries. Send a new code.", 429);

  // Take one try before comparing, and only if nobody took it first: of parallel requests that
  // read the same count, one goes on and the rest are refused, so a code never gets more than
  // MAX_TRIES guesses, however many arrive at once.
  const { data: took } = await db()
    .from("login_codes")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .select("id");
  if (!took?.length) return fail("One try at a time. Wait a second and enter the code again.", 429);

  if (!codeMatches(email, code, row.code_hash)) {
    const left = MAX_TRIES - row.attempts - 1;
    return fail(left > 0 ? `That code does not match. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Send a new code.", 400);
  }
  // Single use: only the request that marks it used signs in.
  const { data: used } = await db()
    .from("login_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!used?.length) return fail("This code was already used. Send a new one.", 410);
  await startSession(row.player_id);
  return NextResponse.json({ ok: true });
}
