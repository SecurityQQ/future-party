import { NextResponse } from "next/server";
import { endSession } from "@/lib/session";

// Sign this device out. The traveler can come back with their card or an email code.
export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}
