import { currentPlayer } from "@/lib/session";
import TopBar from "@/components/TopBar";
import NfcScan from "@/components/NfcScan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan a pass · The Future 2050" };

// The pass scanner: every pass from the party opens its traveler's Kin.
export default async function ScanPage() {
  const me = await currentPlayer();
  return (
    <main className="shell stack">
      <TopBar me={me} />
      <NfcScan />
    </main>
  );
}
