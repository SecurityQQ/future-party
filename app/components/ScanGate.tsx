import Link from "next/link";
import { leaderboard, totals } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import Hull from "./Hull";
import TopBar from "./TopBar";

// The Station for a phone with no traveler: the party is over, so it shows what the night was and how it ended.
export default function ScanGate() {
  const t = totals();
  const top = leaderboard().slice(0, 3);
  return (
    <main className="shell stack">
      <TopBar me={null} />
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app/img/station.webp" alt="Arrival Station orbiting a ringed planet" />
        <p className="hero-tag">Arrival Station · 2050</p>
      </div>
      <div className="intro">
        <h1>Meet the <em>Kin</em></h1>
        <p>On 20 November 2026 nobody arrived alone. Every traveler at Varga Future Party was met by their Kin: a companion from 2050, shaped by the sky they were born under and the life they lead. The party is over; every Kin is still here. <b>The future is who you meet.</b></p>
      </div>

      <Hull title="The night in 2050" code="FINAL">
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
        <div className="btns two" style={{ marginTop: 14 }}>
          <Link className="btn ghost" href="/app/leaderboard">Full ranking</Link>
          <Link className="btn ghost" href="/app/leaderboard?tab=cards">All Kin</Link>
        </div>
      </Hull>

      <Hull title="Looking for your Kin?">
        <p style={{ marginTop: 0 }}>A phone that was signed in at the party still opens its traveler’s Kin here. Logging in closed with the party, but every Kin has its public card: find yours in All Kin, or tap your pass.</p>
        <Link className="btn ghost" href="/app/scan">Scan a pass</Link>
      </Hull>
    </main>
  );
}
