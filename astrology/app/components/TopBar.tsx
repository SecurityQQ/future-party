import Link from "next/link";
import type { Player } from "@/lib/db";
import PilotChip from "./PilotChip";

export default function TopBar({ me }: { me: Player | null }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        KIN<i>2050</i>
        <small>THE FUTURE PARTY</small>
      </Link>
      <PilotChip initial={me ? { name: me.name, sign: me.sign, card_no: me.card_no } : null} />
    </header>
  );
}
