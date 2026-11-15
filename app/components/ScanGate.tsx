import Link from "next/link";
import { leaderboard, totals } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import Hull from "./Hull";
import TopBar from "./TopBar";
import NfcScan from "./NfcScan";

// The Station for someone with no traveler on this phone: the pass scanner first, then what this
// is, a way back in by email, and how the night is going.
export default async function ScanGate() {
  const [t, board] = await Promise.all([totals(), leaderboard()]);
  const top = board.slice(0, 3);
  return (
    <main className="shell stack">
      <TopBar me={null} />
      <NfcScan signedIn={false} />
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app/img/station.webp" alt="Arrival Station orbiting a ringed planet" />
        <p className="hero-tag">Arrival Station · 2050</p>
      </div>
      <div className="intro">
        <h1>Meet your <em>Kin</em></h1>
        <p>It is 2050, and nobody arrives alone. Every traveler is met by their Kin: a companion from the future, shaped by the sky you were born under and the life you lead. <b>The future is who you meet.</b></p>
      </div>

      <Hull title="Already a traveler?">
        <p style={{ marginTop: 0 }}>New phone or browser? Log in with the email you gave the Station and we send you a code.</p>
        <Link className="btn ghost" href="/app/login">Log in with email</Link>
      </Hull>

      <Hull title="How it works">
        <ol className="steps">
          <li><div><b>Tap your pass</b>Hold the card to the back of your phone. You have arrived in 2050.</div></li>
          <li><div><b>Meet the oracles</b>Give your name and birthday. Three oracles of 2050 read your sky while your Kin crosses over.</div></li>
          <li><div><b>Fill your orbit</b>Tap the pass of everyone you meet and their Kin joins your orbit. The fullest orbit tops the ranking.</div></li>
        </ol>
      </Hull>

      <Hull title="Tonight in 2050" code="LIVE">
        <div className="kpis">
          <div className="kpi"><b>{t.players}</b><span>travelers</span></div>
          <div className="kpi"><b>{t.collections}</b><span>collected</span></div>
          <div className="kpi"><b>{t.scans}</b><span>scans</span></div>
        </div>
        {top.length > 0 && (
          <ol className="ranks" style={{ marginTop: 14 }}>
            {top.map((r, i) => (
              <li key={r.id}>
                <Link href={`/app/c/${r.card_no}`} className="rank">
                  <span className="pos">{i + 1}</span>
                  <span className="face">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image_url ? <img src={r.image_url} alt="" /> : null}
                  </span>
                  <span className="who"><b>{r.name}</b><span>{rankTitle(r.collected)}</span></span>
                  <span className="score">{r.collected}<small>KIN</small></span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div style={{ marginTop: 14 }}><Link className="btn ghost" href="/app/leaderboard">Full ranking</Link></div>
      </Hull>
    </main>
  );
}
