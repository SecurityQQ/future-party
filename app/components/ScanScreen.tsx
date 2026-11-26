import Link from "next/link";
import type { PublicCard } from "@/lib/db";
import Hull from "./Hull";
import { CharacterCard } from "./CharacterCard";
import MyCharacter from "./MyCharacter";

const NavButtons = ({ signedIn }: { signedIn: boolean }) => (
  <div className="btns two">
    <Link className="btn ghost" href="/app">{signedIn ? "My orbit" : "The Station"}</Link>
    <Link className="btn ghost" href="/app/leaderboard">Ranking</Link>
  </div>
);

// What a pass (RFID/NFC tag) or a traveler's QR code (link: a Kin link, /t/kin-<n>) shows now that the party
// is over: whose Kin it is. Passes no longer collect anything, bind or sign anyone in.
export default function ScanScreen({ code, link = false, owner, me, orbit }: {
  code: string; link?: boolean; owner: PublicCard | null; me: PublicCard | null; orbit: boolean;
}) {
  if (!owner)
    return (
      <Hull title="Blank pass" code={code} led="amber">
        <p style={{ marginTop: 0 }}>Nobody bound this pass to their Kin during the party, and the party is over, so it stays blank.</p>
        <NavButtons signedIn={!!me} />
      </Hull>
    );

  if (me?.id === owner.id)
    return (
      <div className="stack">
        <MyCharacter card={me}>
          <Hull title="Your pass" code={code}>
            <p style={{ marginTop: 0 }}>
              {link ? "This is your own link, the one in your QR code." : "This is your pass."}
              {me.collected_by ? ` ${me.collected_by} traveler${me.collected_by === 1 ? "" : "s"} collected ${me.character} at the party.` : ""}
            </p>
            <NavButtons signedIn />
          </Hull>
        </MyCharacter>
      </div>
    );

  return (
    <div className="stack">
      {orbit && <div className="banner info">In your orbit</div>}
      <CharacterCard card={owner} />
      <Hull title={`${owner.name.split(" ")[0]}’s Kin`} code={code}>
        <p style={{ marginTop: 0 }}>The party is over, so passes no longer add a Kin to anyone’s orbit. Collected {owner.collected_by ?? 0} time{owner.collected_by === 1 ? "" : "s"} on the night.</p>
        <NavButtons signedIn={!!me} />
      </Hull>
    </div>
  );
}
