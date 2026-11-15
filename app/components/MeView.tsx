import Link from "next/link";
import { toProfile, type Player } from "@/lib/db";
import { cardOf, holdOf, leaderboard, passCodeOf } from "@/lib/queries";
import { incomingRequests, settleLegacy } from "@/lib/orbit";
import OrbitRequests from "./OrbitRequests";
import { nextRank, rankTitle } from "@/lib/ranks";
import { cardUrl, passUrl, qrSvg, siteOrigin } from "@/lib/url";
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
  await settleLegacy(me.id); // old mutual "friends" pairs become orbit entries
  const [card, hold, board, requests, origin, pass] = await Promise.all([cardOf(me), holdOf(me.id), leaderboard(), incomingRequests(me.id), siteOrigin(), passCodeOf(me)]);
  const url = cardUrl(origin, me.card_no);
  // The QR is the same link as the pass: whoever scans it collects this Kin (or logs in / joins first).
  const qr = await qrSvg(passUrl(origin, pass));
  const profile = toProfile(me);
  const pos = board.findIndex((r) => r.id === me.id) + 1;
  const others = Math.max(board.length - 1, hold.length);
  const up = nextRank(hold.length);
  const slots = Math.min(Math.max(0, others - hold.length), 8);
  const first = me.name.split(" ")[0];

  return (
    <main className="shell stack">
      <TopBar me={me} />
      <OrbitRequests requests={requests} />
      <MyCharacter card={card} redraw={{ used: me.redraws, hasPrev: !!me.prev_image_url }} />

      {!me.email && (
        <Hull title="Add your email" led="amber">
          <p style={{ marginTop: 0 }}>Your way back in on any phone: log in with your email and we send you a code. No password.</p>
          <Link className="btn ghost small" href="/app/me/profile">Add email</Link>
        </Hull>
      )}

      <SharePanel url={url} qr={qr} title={`${me.character} · ${first}’s Kin`} character={me.character} />

      <Hull title="Your profile" code="OPTIONAL">
        {hasProfile(profile) ? (
          <ProfileDetails profile={profile} />
        ) : (
          <p style={{ marginTop: 0 }} className="muted">Tell other travelers who you are: a line about you, what to ask you about, your links. All optional.</p>
        )}
        <Link className="btn ghost small" href="/app/me/profile" style={{ marginTop: 12 }}>{hasProfile(profile) ? "Edit profile" : "Set up profile"}</Link>
      </Hull>

      <Hull title="Traveler record" code={`№ ${String(me.card_no).padStart(3, "0")}`}>
        <div className="kpis">
          <div className="kpi"><b>{hold.length}</b><span>in your orbit</span></div>
          <div className="kpi"><b>{card.collected_by ?? 0}</b><span>have you</span></div>
          <div className="kpi"><b>#{pos || "–"}</b><span>ranking</span></div>
        </div>
        <p className="mono small" style={{ margin: "12px 0 0", color: "var(--green)" }}>
          RANK: {rankTitle(hold.length).toUpperCase()}
          {up && <span className="muted"> · {up.need} more to {up.title}</span>}
        </p>
      </Hull>

      <Hull title="Orbit" code={`${hold.length}/${others}`}>
        {hold.length === 0 && <p style={{ marginTop: 0 }} className="muted">Empty. Tap other travelers’ passes or scan their QR codes to bring their Kin into your orbit, or send an orbit request from their card.</p>}
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
