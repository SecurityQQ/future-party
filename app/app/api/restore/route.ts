import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/session";
import { recordScan, TAG_RE } from "@/lib/guests";
import { validBirthday } from "@/lib/zodiac";

// "This is my card": on a new phone, the card's owner proves it with their birthday.
export async function POST(req: Request) {
  const { tag, birthday } = (await req.json().catch(() => ({}))) as { tag?: string; birthday?: string };
  if (!tag || !TAG_RE.test(tag) || !validBirthday(birthday)) return NextResponse.json({ error: "Enter your date of birth" }, { status: 400 });
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db().from("scans").select("id", { count: "exact", head: true }).eq("tag_code", tag).eq("kind", "restore-fail").gte("created_at", since);
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "Too many tries. Wait ten minutes." }, { status: 429 });
  const { data: t } = await db().from("tags").select("player:players(id, birthday)").eq("code", tag).maybeSingle();
  const owner = (t as any)?.player as { id: string; birthday: string } | null;
  if (!owner || owner.birthday !== birthday) {
    await recordScan(tag, null, "restore-fail");
    return NextResponse.json({ error: "The stars do not recognize that date." }, { status: 403 });
  }
  await startSession(owner.id);
  await recordScan(tag, owner.id, "restore");
  return NextResponse.json({ ok: true });
}
