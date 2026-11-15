import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, toProfile } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { findPlayer } from "@/lib/character";
import { cardOf, passCodeOf } from "@/lib/queries";
import { orbitState, type OrbitState } from "@/lib/orbit";
import { cardUrl, passUrl, qrSvg, siteOrigin } from "@/lib/url";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import LiveCard from "@/components/LiveCard";
import ProfileBlock from "@/components/ProfileBlock";
import OrbitButton from "@/components/OrbitButton";
import SharePanel from "@/components/SharePanel";
import { CARD, OPEN_GRAPH, X } from "@/lib/share";

export const dynamic = "force-dynamic";

// A traveler's public card: /c/<card number> (the share link and its QR) or /c/<player id>.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await findPlayer((await params).id);
  if (!p) return { title: "The Future 2050" };
  const title = `${p.character} · ${p.name.split(" ")[0]}’s Kin · The Future 2050`;
  const description = p.prophecy ?? "Every traveler at Varga Future Party is met by their Kin. Tap to meet this one.";
  // A page's openGraph replaces the layout's, so the app's card stays the picture until the Kin is drawn. Then it is
  // the Kin's own 1200 × 630 card (./card/route.tsx), versioned by the picture so a redrawn Kin gets a fresh card.
  const ver = p.image_url?.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
  const alt = `${p.character}, ${p.name.split(" ")[0]}’s Kin at Varga Future Party 2050`;
  const images = p.image_url ? [{ url: `/app/c/${p.card_no}/card?v=${encodeURIComponent(ver)}`, width: 1200, height: 630, alt }] : [CARD];
  return { title, description, openGraph: { ...OPEN_GRAPH, title, description, images }, twitter: { card: "summary_large_image", site: X, title, description, images } };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([findPlayer(id), currentPlayer()]);
  if (!p) notFound();
  const own = me?.id === p.id;
  const [card, state, origin] = await Promise.all([
    cardOf(p),
    me && !own ? orbitState(me.id, p.id) : ("none" as OrbitState),
    siteOrigin(),
  ]);
  const url = cardUrl(origin, p.card_no);

  return (
    <main className="shell stack">
      <TopBar me={me} />
      {!own && (
        <OrbitButton
          target={String(p.card_no)}
          name={p.name}
          initial={state}
          signedIn={!!me}
          back={`/app/c/${p.card_no}`}
          kin={{ image: p.image_url, character: p.character, sign: p.sign }}
        />
      )}
      <LiveCard card={card} />
      <ProfileBlock name={p.name} profile={toProfile(p)} />
      {own ? (
        <SharePanel url={url} qr={await qrSvg(passUrl(origin, await passCodeOf(p)))} title={`${p.character} · ${p.name.split(" ")[0]}’s Kin`} character={p.character} />
      ) : (
        <div className="btns two">
          <Link className="btn ghost" href="/app">{me ? "My Kin" : "The Station"}</Link>
          <Link className="btn ghost" href="/app/leaderboard">Ranking</Link>
        </div>
      )}
    </main>
  );
}
