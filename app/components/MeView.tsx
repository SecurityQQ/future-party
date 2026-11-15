import Link from "next/link";
import { toProfile, type Player } from "@/lib/db";
import { cardOf, friendsOf, holdOf, leaderboard } from "@/lib/queries";
import { nextRank, rankTitle } from "@/lib/ranks";
import { cardUrl, qrSvg, siteOrigin } from "@/lib/url";
import Hull from "./Hull";
import TopBar from "./TopBar";
import MyCharacter from "./MyCharacter";
import SharePanel from "./SharePanel";
import SignOut from "./SignOut";
import { MiniCard } from "./CharacterCard";
import { ProfileDetails, hasProfile } from "./ProfileBlock";

// The signed-in traveler's home, at / and /me: their Kin, its share link and QR, their profile,
// their record, friends and orbit.
export default async function MeView({ me }: { me: Player }) {
  const [card, hold, board, friends, origin] = await Promise.all([cardOf(me), holdOf(me.id), leaderboard(), friendsOf(me.id), siteOrigin()]);
  const url = cardUrl(origin, me.card_no);
  const qr = await qrSvg(url);
  const profile = toProfile(me);
  const pos = board.findIndex((r) => r.id === me.id) + 1;
  const others = Math.max(board.length - 1, hold.length);
  const up = nextRank(hold.length);
  const slots = Math.min(Math.max(0, others - hold.length), 8);
  const first = me.name.split(" ")[0];

  return (
    <main className="shell stack">
      <TopBar me={me} />
      <MyCharacter card={card} redraw={{ used: me.redraws, hasPrev: !!me.prev_image_url }} />

      {!me.email && (
        <Hull title="Add your email" led="amber">
          <p style={{ marginTop: 0 }}>So you can get back in on any phone: enter it at the Station and we email you a code.</p>
          <Link className="btn ghost small" href="/app/me/profile">Add email</Link>
        </Hull>
      )}

      <SharePanel url={url} qr={qr} title={`${me.character} · ${first}’s Kin`} character={me.character} />

      <Hull title="Mirror" code="CAMERA">
        <p style={{ marginTop: 0 }}>Take your Kin into the mirror: open your palm in front of the camera and it lands on your hand, with your orbit circling around you. Eight more camera effects that went viral on X come with it. The camera stays on your phone.</p>
        <a className="btn" href="/app/mirror?fx=kin">Open the mirror</a>
      </Hull>

      <Hull title="Your profile" code="OPTIONAL">
        {hasProfile(profile) ? (
          <ProfileDetails profile={profile} />
        ) : (
          <p style={{ marginTop: 0 }} className="muted">Tell other travelers who you are: a line about you, what to ask you about, your links. All optional.</p>
        )}
        <Link className="btn ghost small" href="/app/me/profile" style={{ marginTop: 12 }}>{hasProfile(profile) ? "Edit profile" : "Set up profile"}</Link>
      </Hull>

      <Hull title="Traveler record" code={`№ ${String(me.card_no).padStart(3, "0")}`}>
        <div className="kpis four">
          <div className="kpi"><b>{hold.length}</b><span>in orbit</span></div>
          <div className="kpi"><b>{card.collected_by ?? 0}</b><span>collected you</span></div>
          <div className="kpi"><b>{friends.length}</b><span>friends</span></div>
          <div className="kpi"><b>#{pos || "–"}</b><span>ranking</span></div>
        </div>
        <p className="mono small" style={{ margin: "12px 0 0", color: "var(--green)" }}>
          RANK: {rankTitle(hold.length).toUpperCase()}
          {up && <span className="muted"> · {up.need} more to {up.title}</span>}
        </p>
      </Hull>

      {friends.length > 0 && (
        <Hull title="Friends" code={`${friends.length}`}>
          <div className="grid">
            {friends.map((c) => <MiniCard key={c.id} card={c} />)}
          </div>
        </Hull>
      )}

      <Hull title="Orbit" code={`${hold.length}/${others}`}>
        {hold.length === 0 && <p style={{ marginTop: 0 }} className="muted">Empty. Tap other travelers’ passes to bring their Kin into your orbit.</p>}
        <div className="grid">
          {hold.map((c) => <MiniCard key={c.id} card={c} />)}
          {Array.from({ length: slots }, (_, i) => <div key={i} className="slot">?</div>)}
        </div>
        <Link className="btn" href="/app/scan" style={{ marginTop: 14 }}>Scan a pass</Link>
      </Hull>

      <SignOut />
    </main>
  );
}
