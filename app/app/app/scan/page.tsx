import { currentPlayer } from "@/lib/session";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import NfcScan from "@/components/NfcScan";
import EmailLogin from "@/components/EmailLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan a pass · The Future 2050" };

// The pass scanner on its own: to join (no traveler yet) or to bring someone's Kin into your orbit.
export default async function ScanPage() {
  const me = await currentPlayer();
  return (
    <main className="shell stack">
      <TopBar me={me} />
      {!me && (
        <div className="stack login-first">
          <EmailLogin next="/app/scan" autoFocus={false} />
          <div className="or">new here?</div>
        </div>
      )}
      <NfcScan signedIn={!!me} />
      {me && (
        <Hull title="No pass at hand?">
          <p style={{ marginTop: 0 }}>Scan the QR code on their phone (My Kin, Share) with your camera: it adds their Kin to your orbit just like a tap.</p>
        </Hull>
      )}
    </main>
  );
}
