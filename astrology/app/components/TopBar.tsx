import Link from "next/link";
import type { Player } from "@/lib/db";
import PilotChip from "./PilotChip";

export default function TopBar({ me }: { me: Player | null }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        THE FUTURE<i>2050</i>
        <small>ARRIVAL STATION</small>
      </Link>
      <PilotChip initial={me ? { name: me.name, sign: me.sign, card_no: me.card_no } : null} />
    </header>
  );
}
