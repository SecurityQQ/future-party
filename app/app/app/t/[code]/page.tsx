import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db, type Player } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { KIN_LINK, recordScan, TAG_RE } from "@/lib/guests";
import { findPlayer, getPlayer, refresh } from "@/lib/character";
import { cardOf, hasTag, holdOf, totals } from "@/lib/queries";
import ScanScreen, { type ScanState } from "@/components/ScanScreen";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pass · The Future 2050" };

// The URL written on each RFID/NFC card, /t/<code>, and in every traveler's QR code (/t/<pass code>, or
// /t/kin-<card number> without a pass). Opening it always ends in one of three things: a new traveler, a
// blank pass bound to you, or this traveler's Kin added to your orbit. A phone with no traveler is asked
// to log in with email first (ScanScreen).
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!TAG_RE.test(code)) notFound();
  const me = await currentPlayer();
  // A real card tap is a full page load; router.refresh() after claim/restore is not a new scan.
  const h = await headers();
  const softRefresh = h.has("rsc") || h.has("next-router-state-tree");
  const log = (player: string | null, kind: string) => (softRefresh ? Promise.resolve() : recordScan(code, player, kind));

  const kin = code.match(KIN_LINK);
  let owner: Player | null;
  if (kin) {
    owner = await findPlayer(kin[1]);
    if (!owner) notFound();
  } else {
    let { data: tag } = await db().from("tags").select("code, player_id").eq("code", code).maybeSingle();
    if (!tag) {
      await db().from("tags").upsert({ code }, { onConflict: "code", ignoreDuplicates: true });
      tag = { code, player_id: null };
    }
    owner = tag.player_id ? await getPlayer(tag.player_id) : null;
  }
  if (owner && owner.status !== "done" && owner.status !== "failed") owner = (await refresh(owner.id)) ?? owner;

  let state: ScanState;
  let newCollect = false;
  if (!owner) {
    state = !me ? "register" : (await hasTag(me.id)) ? "busy" : "claim";
    await log(me?.id ?? null, "new");
  } else if (me?.id === owner.id) {
    state = "own";
    await log(me.id, "own");
  } else if (me) {
    const { error } = await db().from("collections").insert({ collector_id: me.id, owner_id: owner.id, tag_code: code });
    newCollect = !error;
    state = "collected";
    // A new collect is logged even on a soft refresh (after logging in on this page): it happens once.
    await (newCollect ? recordScan(code, me.id, "collect") : log(me.id, "repeat"));
  } else {
    state = "visitor";
    await log(null, "visitor");
  }

  const [ownerCard, myCard, hold, t] = await Promise.all([
    owner ? cardOf(owner) : null,
    me ? cardOf(me) : null,
    me ? holdOf(me.id) : [],
    totals(),
  ]);

  return (
    <main className="shell">
      <TopBar me={me} />
      <ScanScreen
        state={state}
        code={code}
        link={!!kin}
        owner={ownerCard}
        me={me && myCard ? { id: me.id, name: me.name, card: myCard, hasTag: state !== "claim" } : null}
        newCollect={newCollect}
        hold={hold.length}
        total={t.players}
      />
    </main>
  );
}
