import { toProfile, type Player } from "@/lib/db";
import { cardOf, holdOf, leaderboard } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import { cardUrl, qrSvg, siteOrigin } from "@/lib/url";
import Hull from "./Hull";
import TopBar from "./TopBar";
import MyCharacter from "./MyCharacter";
import SharePanel from "./SharePanel";
import { MiniCard } from "./CharacterCard";
import { ProfileDetails, hasProfile } from "./ProfileBlock";

// The signed-in traveler's home, at / and /me: their Kin, its share link and QR, their profile,
// their record and their orbit, as the party left them.
export default async function MeView({ me }: { me: Player }) {
  const card = cardOf(me);
  const hold = holdOf(me.id);
  const pos = leaderboard().findIndex((r) => r.id === me.id) + 1;
  const url = cardUrl(await siteOrigin(), me.card_no);
  const profile = toProfile(me);
  const first = me.name.split(" ")[0];

  return (
    <main className="shell stack">
      <TopBar me={me} />
      <MyCharacter card={card} />

      <SharePanel url={url} qr={await qrSvg(url)} title={`${me.character} · ${first}’s Kin`} character={me.character} />

      {hasProfile(profile) && (
        <Hull title="Your profile">
          <ProfileDetails profile={profile} />
        </Hull>
      )}

      <Hull title="Traveler record" code={`№ ${String(me.card_no).padStart(3, "0")}`}>
        <div className="kpis">
          <div className="kpi"><b>{hold.length}</b><span>in your orbit</span></div>
          <div className="kpi"><b>{card.collected_by ?? 0}</b><span>have you</span></div>
          <div className="kpi"><b>#{pos || "–"}</b><span>ranking</span></div>
        </div>
        <p className="mono small" style={{ margin: "12px 0 0", color: "var(--green)" }}>RANK: {rankTitle(hold.length).toUpperCase()}</p>
      </Hull>

      <Hull title="Orbit" code={`${hold.length}`}>
        {hold.length === 0 && <p style={{ marginTop: 0 }} className="muted">Nobody joined your orbit during the party.</p>}
        <div className="grid">
          {hold.map((c) => <MiniCard key={c.id} card={c} />)}
        </div>
      </Hull>
    </main>
  );
}
