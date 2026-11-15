import { currentPlayer } from "@/lib/session";
import MeView from "@/components/MeView";
import ScanGate from "@/components/ScanGate";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Kin · The Future 2050" };

// /me is the same page as /: a link to your own Kin that works on any of your phones.
export default async function MePage() {
  const me = await currentPlayer();
  return me ? <MeView me={me} /> : <ScanGate />;
}
