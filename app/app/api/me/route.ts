import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/session";

// Who this device is signed in as (for the pilot chip in the top bar).
export async function GET() {
  const me = await currentPlayer();
  return NextResponse.json(me ? { name: me.name, sign: me.sign, card_no: me.card_no } : null, { headers: { "Cache-Control": "no-store" } });
}
