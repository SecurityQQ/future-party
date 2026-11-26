import Link from "next/link";
import { redirect } from "next/navigation";
import { toProfile } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { holdOf, leaderboard } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import { GLYPH } from "@/lib/zodiac";
import { ProfileDetails, hasProfile } from "@/components/ProfileBlock";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import SignOut from "@/components/SignOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile · The Future 2050" };

// Your profile, opened from your name in the top bar: who you are at a glance (Kin, sign, number, rank),
// then what others see on your card. The party is over, so it no longer changes.
export default async function ProfilePage() {
  const me = await currentPlayer();
  if (!me) redirect("/app/login");
  const hold = holdOf(me.id);
  const pos = leaderboard().findIndex((r) => r.id === me.id) + 1;
  const profile = toProfile(me);
  return (
    <main className="shell stack">
      <TopBar me={me} />
      <Hull title="Your profile" code={`№ ${String(me.card_no).padStart(3, "0")}`}>
        <div className="profile-head">
          <Link href={`/app/c/${me.card_no}`} className="face" aria-label="Your public card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.image_url ? <img src={me.image_url} alt="" /> : <span>{GLYPH[me.sign]}</span>}
          </Link>
          <div>
            <h1>{me.name}</h1>
            <p className="muted">{GLYPH[me.sign]}{"︎"} {me.sign} · {me.character}</p>
            <p className="mono small">{rankTitle(hold.length).toUpperCase()} · {hold.length} IN ORBIT · #{pos || "–"}</p>
          </div>
        </div>
        <div className="btns two" style={{ marginTop: 12 }}>
          <Link className="btn ghost small" href={`/app/c/${me.card_no}`}>See my public card</Link>
          <Link className="btn ghost small" href="/app">My Kin</Link>
        </div>
      </Hull>
      {hasProfile(profile) && (
        <Hull title="On your card">
          <ProfileDetails profile={profile} />
        </Hull>
      )}
      <SignOut />
      <p className="small muted" style={{ margin: 0, textAlign: "center" }}>Logging in closed with the party: once this phone signs out, it cannot sign back in.</p>
    </main>
  );
}
