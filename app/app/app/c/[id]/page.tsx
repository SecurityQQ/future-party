import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findPlayer, toProfile } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { cardOf, inOrbit } from "@/lib/queries";
import { cardUrl, qrSvg, siteOrigin } from "@/lib/url";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import { CharacterCard } from "@/components/CharacterCard";
import ProfileBlock from "@/components/ProfileBlock";
import SharePanel from "@/components/SharePanel";
import { CARD, OPEN_GRAPH, X } from "@/lib/share";
import FableReading from "@/components/FableReading";
import LangPicker from "@/components/LangPicker";
import { pairFor } from "@/lib/fable";
import { getLang } from "@/lib/lang";
import { DICTS, signName, t } from "@/lib/i18n";
import { GLYPH } from "@/lib/zodiac";

export const dynamic = "force-dynamic";

// A traveler's public card: /c/<card number> (the share link and its QR) or /c/<player id>.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = findPlayer((await params).id);
  if (!p) return { title: "The Future 2050" };
  const title = `${p.character} · ${p.name.split(" ")[0]}’s Kin · The Future 2050`;
  const description = p.prophecy ?? "Every traveler at Varga Future Party was met by their Kin. Meet this one.";
  // A page's openGraph replaces the layout's, so the app's card stays the picture until the Kin is drawn. Then it is
  // the Kin's own 1200 × 630 card (./card/route.tsx), versioned by the picture so a redrawn Kin gets a fresh card.
  const ver = p.image_url?.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
  const alt = `${p.character}, ${p.name.split(" ")[0]}’s Kin at Varga Future Party 2050`;
  const images = p.image_url ? [{ url: `/app/c/${p.card_no}/card?v=${encodeURIComponent(ver)}`, width: 1200, height: 630, alt }] : [CARD];
  return { title, description, openGraph: { ...OPEN_GRAPH, title, description, images }, twitter: { card: "summary_large_image", site: X, title, description, images } };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = findPlayer(id);
  if (!p) notFound();
  const [me, origin, lang] = await Promise.all([currentPlayer(), siteOrigin(), getLang()]);
  const own = me?.id === p.id;
  const card = cardOf(p);
  const d = DICTS[lang];
  const first = p.name.split(" ")[0];
  const pair = me && !own ? pairFor(me, p) : null;
  const glyph = (sign: string) => `${GLYPH[sign] ?? ""}\uFE0E`;
  const url = cardUrl(origin, p.card_no);

  return (
    <main className="shell stack">
      <TopBar me={me} />
      {me && !own && inOrbit(me.id, p.id) && <div className="banner info">In your orbit</div>}
      <CharacterCard card={card} />
      <ProfileBlock name={p.name} profile={toProfile(p)} />
      {me && pair && (
        <Hull title={t(lang, "youAnd", { name: first })} code={<LangPicker lang={lang} label={d.language} />} className="pair-card">
          <div className="pair-head">
            <b>{glyph(me.sign)} {signName(lang, me.sign)} + {glyph(p.sign)} {signName(lang, p.sign)} · {t(lang, `pair_${pair.key}`)}</b>
            <span className="score">{pair.score}%</span>
          </div>
          <FableReading id={p.id} pair lang={lang} words={{ reading: d.pairReading, lost: d.lost }} />
          <div className="btns two">
            <Link className="btn ghost" href="/app/fable#friends">{d.tabFriends}</Link>
            <Link className="btn ghost" href="/app/fable#party">{d.tabParty}</Link>
          </div>
        </Hull>
      )}
      <Hull title={t(lang, "readsYou", { name: first })} code={`${glyph(p.sign)} ${signName(lang, p.sign).toUpperCase()}`}>
        <FableReading id={p.id} lang={lang} words={{ reading: d.reading, lost: d.lost }} />
      </Hull>
      {own ? (
        <SharePanel url={url} qr={await qrSvg(url)} title={`${p.character} · ${p.name.split(" ")[0]}’s Kin`} character={p.character} />
      ) : (
        <div className="btns two">
          <Link className="btn ghost" href="/app">{me ? "My Kin" : "The Station"}</Link>
          <Link className="btn ghost" href="/app/leaderboard">Ranking</Link>
        </div>
      )}
    </main>
  );
}
