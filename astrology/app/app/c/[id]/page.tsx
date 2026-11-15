import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, toProfile } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { findPlayer } from "@/lib/character";
import { areFriends, cardOf } from "@/lib/queries";
import { cardUrl, qrSvg, siteOrigin } from "@/lib/url";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import LiveCard from "@/components/LiveCard";
import ProfileBlock from "@/components/ProfileBlock";
import FriendButton, { type FriendState } from "@/components/FriendButton";
import SharePanel from "@/components/SharePanel";

export const dynamic = "force-dynamic";

// A traveler's public card: /c/<card number> (the share link and its QR) or /c/<player id>.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await findPlayer((await params).id);
  if (!p) return { title: "Kin 2050" };
  const title = `${p.character} · ${p.name.split(" ")[0]}’s Kin · Kin 2050`;
  const description = p.prophecy ?? "Every traveler at The Future Party is met by their Kin. Tap to meet this one.";
  const images = p.image_url ? [{ url: p.image_url, width: 900, height: 1200, alt: p.character }] : [];
  return { title, description, openGraph: { title, description, images }, twitter: { card: "summary_large_image", title, description, images } };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([findPlayer(id), currentPlayer()]);
  if (!p) notFound();
  const own = me?.id === p.id;
  const [card, inOrbit, friends, origin] = await Promise.all([
    cardOf(p),
    me && !own ? db().from("collections").select("owner_id").eq("collector_id", me.id).eq("owner_id", p.id).maybeSingle().then((r) => !!r.data) : false,
    me && !own ? areFriends(me.id, p.id) : false,
    siteOrigin(),
  ]);
  const url = cardUrl(origin, p.card_no);
  const friendState: FriendState = !me ? "anon" : friends ? "friends" : "none";

  return (
    <main className="shell stack">
      <TopBar me={me} />
      {!own && <FriendButton target={String(p.card_no)} name={p.name} initial={friendState} back={`/c/${p.card_no}`} />}
      <LiveCard card={card} />
      <ProfileBlock name={p.name} profile={toProfile(p)} />
      {own ? (
        <SharePanel url={url} qr={await qrSvg(url)} title={`${p.character} · ${p.name.split(" ")[0]}’s Kin`} />
      ) : (
        <Hull title={inOrbit ? "In your orbit" : "Not in your orbit yet"} led={inOrbit ? "green" : "amber"}>
          <p style={{ marginTop: 0 }}>
            {inOrbit
              ? `You collected ${p.name}'s ${p.character}.`
              : `Find ${p.name.split(" ")[0]} at the party and tap their pass to bring ${p.character} into your orbit.`}
          </p>
          <div className="btns two">
            <Link className="btn ghost" href="/">{me ? "My Kin" : "The Station"}</Link>
            <Link className="btn ghost" href="/leaderboard">Ranking</Link>
          </div>
        </Hull>
      )}
    </main>
  );
}
