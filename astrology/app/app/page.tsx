import { currentPlayer } from "@/lib/session";
import MeView from "@/components/MeView";
import ScanGate from "@/components/ScanGate";

export const dynamic = "force-dynamic";

// The Station: your own Kin when this phone has a traveler, otherwise the pass scanner.
export default async function Home() {
  const me = await currentPlayer();
  return me ? <MeView me={me} /> : <ScanGate />;
}
