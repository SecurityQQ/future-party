import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in · The Future 2050", robots: { index: false } };

// Email login ended with the party. The page stays for the links in login emails and old buttons.
export default async function LoginPage() {
  if (await currentPlayer()) redirect("/app");
  return (
    <main className="shell stack">
      <TopBar me={null} />
      <Hull title="Log in" code="CLOSED" led="amber">
        <p style={{ marginTop: 0 }}>The party is over, and logging in closed with it. A phone that was signed in on the night still opens its traveler’s Kin. Every Kin has its public card: find yours in the ranking.</p>
        <div className="btns two">
          <Link className="btn" href="/app/leaderboard?tab=cards">All Kin</Link>
          <Link className="btn ghost" href="/app/leaderboard">Ranking</Link>
        </div>
      </Hull>
    </main>
  );
}
