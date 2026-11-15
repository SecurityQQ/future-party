import Link from "next/link";
import { currentPlayer } from "@/lib/session";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import NfcScan from "@/components/NfcScan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan a pass · The Future 2050" };

// The pass scanner on its own: to join (no traveler yet) or to bring someone's Kin into your orbit.
export default async function ScanPage() {
  const me = await currentPlayer();
  return (
    <main className="shell stack">
      <TopBar me={me} />
      <NfcScan signedIn={!!me} />
      {!me && (
        <Hull title="Already a traveler?">
          <p style={{ marginTop: 0 }}>New phone or browser? Log in with your email instead.</p>
          <Link className="btn ghost" href="/app/login">Log in with email</Link>
        </Hull>
      )}
    </main>
  );
}
