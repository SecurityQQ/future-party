import Link from "next/link";
import { redirect } from "next/navigation";
import { toProfile } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { holdOf, leaderboard } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import { GLYPH } from "@/lib/zodiac";
import { hasProfile } from "@/components/ProfileBlock";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import ProfileForm from "@/components/ProfileForm";
import SignOut from "@/components/SignOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile · The Future 2050" };

// Your profile, opened from your name in the top bar: who you are at a glance (Kin, sign, number,
// rank, whether you can log in elsewhere), then what others see on your card, then the login email.
export default async function ProfilePage() {
  const me = await currentPlayer();
  if (!me) redirect("/app/login?next=/app/me/profile");
  const [hold, board] = await Promise.all([holdOf(me.id), leaderboard()]);
  const pos = board.findIndex((r) => r.id === me.id) + 1;
  const filled = hasProfile(toProfile(me));
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
        <ul className="checklist">
          <li className={me.email ? "ok" : "todo"}><span>{me.email ? <>Login email set: <b>{me.email}</b></> : "No login email yet: add one below to log in on any phone"}</span></li>
          <li className={filled ? "ok" : "todo"}><span>{filled ? "Your card shows a line about you and your links" : "Tell other travelers who you are: fill in About you and Links"}</span></li>
        </ul>
        <div className="btns two" style={{ marginTop: 12 }}>
          <Link className="btn ghost small" href={`/app/c/${me.card_no}`}>See my public card</Link>
          <Link className="btn ghost small" href="/app">My Kin</Link>
        </div>
      </Hull>
      <ProfileForm initial={{ name: me.name, email: me.email ?? "", bio: me.bio ?? "", ask_me: me.ask_me ?? "", links: me.links ?? {} }} />
      <SignOut />
    </main>
  );
}
