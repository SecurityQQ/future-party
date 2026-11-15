import Link from "next/link";
import { currentPlayer } from "@/lib/session";
import { leaderboard, totals } from "@/lib/queries";
import { rankTitle } from "@/lib/ranks";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import AutoRefresh from "@/components/AutoRefresh";
import { MiniCard } from "@/components/CharacterCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking · Kin 2050" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "travelers" } = await searchParams;
  const [me, board, t] = await Promise.all([currentPlayer(), leaderboard(), totals()]);
  const cards = [...board].sort((a, b) => b.collected_by - a.collected_by || a.card_no - b.card_no);

  return (
    <main className="shell wide stack">
      <AutoRefresh />
      <TopBar me={me} />
      <div className="kpis">
        <div className="kpi"><b>{t.players}</b><span>travelers</span></div>
        <div className="kpi"><b>{t.collections}</b><span>cards collected</span></div>
        <div className="kpi"><b>{t.scans}</b><span>scans</span></div>
      </div>
      <nav className="tabs">
        <Link href="/leaderboard?tab=travelers" aria-current={tab !== "cards" ? "page" : undefined}>Top travelers</Link>
        <Link href="/leaderboard?tab=cards" aria-current={tab === "cards" ? "page" : undefined}>All Kin</Link>
      </nav>
      {tab !== "cards" ? (
        <Hull title="Galactic ranking · most cards scanned" code="LIVE">
          {board.length === 0 && <p className="muted" style={{ marginTop: 0 }}>No travelers yet. Be the first to scan a card.</p>}
          <ol className="ranks">
            {board.map((r, i) => (
              <li key={r.id}>
                <Link href={`/c/${r.id}`} className={`rank ${me?.id === r.id ? "me" : ""}`}>
                  <span className="pos">{i + 1}</span>
                  <span className="face">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image_url ? <img src={r.image_url} alt="" loading="lazy" /> : null}
                  </span>
                  <span className="who">
                    <b>{r.name}</b>
                    <span>{rankTitle(r.collected)} · {r.character}</span>
                  </span>
                  <span className="score">{r.collected}<small>CARDS</small></span>
                </Link>
              </li>
            ))}
          </ol>
        </Hull>
      ) : (
        <Hull title="Every Kin at the party" code={`${cards.length}`}>
          <div className="grid">
            {cards.map((r) => (
              <MiniCard key={r.id} card={{ ...r, prophecy: null }} />
            ))}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Sorted by how many travelers collected each Kin.</p>
        </Hull>
      )}
    </main>
  );
}
