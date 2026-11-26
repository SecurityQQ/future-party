import { NextResponse } from "next/server";
import { endSession } from "@/lib/session";

// Sign this device out. Since the party is over, there is no signing back in.
export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}
