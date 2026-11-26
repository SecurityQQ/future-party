import { notFound } from "next/navigation";
import { findPlayer, KIN_LINK, passOwner, TAG_RE } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { cardOf, inOrbit } from "@/lib/queries";
import ScanScreen from "@/components/ScanScreen";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pass · The Future 2050" };

// The URL written on each RFID/NFC pass, /t/<code>, and in every traveler's QR code during the party
// (/t/kin-<card number> without a pass). Now that the party is over, it shows whose Kin it is.
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!TAG_RE.test(code)) notFound();
  const kin = code.match(KIN_LINK);
  const owner = kin ? findPlayer(kin[1]) : passOwner(code);
  if (kin && !owner) notFound();
  const me = await currentPlayer();

  return (
    <main className="shell">
      <TopBar me={me} />
      <ScanScreen
        code={code}
        link={!!kin}
        owner={owner ? cardOf(owner) : null}
        me={me ? cardOf(me) : null}
        orbit={!!(me && owner && inOrbit(me.id, owner.id))}
      />
    </main>
  );
}
