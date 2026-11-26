import { NextResponse } from "next/server";
import type { PublicCard } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { holdOf, leaderboard } from "@/lib/queries";

// The Kin for the mirror (/mirror). Signed in: your own Kin and the Kin in your orbit. Not signed
// in (the projector, a guest without a pass): a handful of the party's Kin. Read-only, and only what
// the ranking already shows: first name, card number, the Kin's name and picture.
type MirrorKin ={ card_no: number; name: string; character: string; image_url: string };

const MAX = 12;
const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const drawn = (c: Pick<PublicCard, "status" | "image_url">) => c.status === "done" && !!c.image_url;
const kin = (c: Pick<PublicCard, "card_no" | "name" | "character" | "image_url">): MirrorKin => ({
  card_no: c.card_no, name: first(c.name), character: c.character, image_url: c.image_url!,
});

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const me = await currentPlayer();
    if (me) {
      const orbit = holdOf(me.id).filter(drawn).slice(0, MAX).map(kin);
      return NextResponse.json({ me: drawn(me) ? kin(me) : null, signedIn: true, orbit, party: [] }, { headers });
    }
    const all = leaderboard().filter(drawn);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return NextResponse.json({ me: null, signedIn: false, orbit: [], party: all.slice(0, MAX).map(kin) }, { headers });
  } catch (e) {
    console.error("mirror kin", e);
    return NextResponse.json({ me: null, signedIn: false, orbit: [], party: [] }, { status: 503, headers });
  }
}
