import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db, type Player } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { recordScan, TAG_RE } from "@/lib/guests";
import { getPlayer, refresh } from "@/lib/character";
import { cardOf, hasTag, holdOf, totals } from "@/lib/queries";
import ScanScreen, { type ScanState } from "@/components/ScanScreen";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pass · The Future 2050" };

// The URL written on each RFID/NFC card: /t/<code>.
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!TAG_RE.test(code)) notFound();
  const me = await currentPlayer();
  // A real card tap is a full page load; router.refresh() after claim/restore is not a new scan.
  const h = await headers();
  const softRefresh = h.has("rsc") || h.has("next-router-state-tree");
  const log = (player: string | null, kind: string) => (softRefresh ? Promise.resolve() : recordScan(code, player, kind));

  let { data: tag } = await db().from("tags").select("code, player_id").eq("code", code).maybeSingle();
  if (!tag) {
    await db().from("tags").upsert({ code }, { onConflict: "code", ignoreDuplicates: true });
    tag = { code, player_id: null };
  }
  let owner: Player | null = tag.player_id ? await getPlayer(tag.player_id) : null;
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
    await log(me.id, newCollect ? "collect" : "repeat");
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
        owner={ownerCard}
        me={me && myCard ? { id: me.id, name: me.name, card: myCard, hasTag: state !== "claim" } : null}
        newCollect={newCollect}
        hold={hold.length}
        total={t.players}
      />
    </main>
  );
}
