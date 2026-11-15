"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicCard } from "@/lib/db";
import Hull from "./Hull";
import { TypedComm } from "./Comm";
import LiveCard from "./LiveCard";
import MyCharacter from "./MyCharacter";
import RegisterQuest from "./RegisterQuest";

export type ScanState = "register" | "claim" | "busy" | "own" | "collected" | "visitor";
type Me = { id: string; name: string; card: PublicCard; hasTag: boolean } | null;

const NavButtons = () => (
  <div className="btns two">
    <Link className="btn ghost" href="/app/me">My orbit</Link>
    <Link className="btn ghost" href="/app/leaderboard">Ranking</Link>
  </div>
);

// Everything that can happen when a pass (RFID/NFC tag) is scanned.
export default function ScanScreen({ state, code, owner, me, newCollect, hold, total }: {
  state: ScanState; code: string; owner: PublicCard | null; me: Me; newCollect: boolean; hold: number; total: number;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<PublicCard | null>(null); // a character registered on this screen
  const [restoring, setRestoring] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function registered(id: string) {
    const j = await (await fetch(`/api/players/${id}`, { cache: "no-store" })).json();
    setMine({ ...j, collected_by: 0 });
    window.dispatchEvent(new Event("zr:pilot"));
  }

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Comm failure");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // A fresh card, scanned by a new phone: register, read the stars, reveal.
  if (state === "register")
    return mine ? (
      <div className="stack">
        <MyCharacter card={mine} redraw={{ used: 0, hasPrev: false }}>
          <Hull title="Card bound" code={code}>
            <p style={{ marginTop: 0 }}>This pass is now yours. When other travelers scan it, your Kin goes into their orbit. Scan theirs to fill yours.</p>
            <NavButtons />
          </Hull>
        </MyCharacter>
      </div>
    ) : (
      <RegisterQuest tag={code} onRegistered={registered} />
    );

  // Someone else's card, scanned by a phone without a pilot.
  if (state === "visitor" && owner) {
    if (mine)
      return (
        <div className="stack">
          <div className="banner">+1 · {owner.name} added to your orbit</div>
          <MyCharacter card={mine} redraw={{ used: 0, hasPrev: false }}>
            <Hull title="Your orbit" code={`1/${total}`}>
              <p style={{ marginTop: 0 }}>You collected <b>{owner.character}</b>. Find your own pass and scan it to bind it to your Kin, then keep scanning other travelers.</p>
              <NavButtons />
            </Hull>
          </MyCharacter>
        </div>
      );
    return (
      <div className="stack">
        <LiveCard card={owner} />
        {restoring ? (
          <Hull title="Identity check" code={code}>
            <TypedComm who="GRUMM" text={`So this is your card, ${owner.name.split(" ")[0]}? New phone, same stars. Prove it with your date of birth.`}>
              <form className="stack" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); post("/api/restore", { tag: code, birthday }); }}>
                <input className="input" type="date" required value={birthday} onChange={(e) => setBirthday(e.target.value)} aria-label="Date of birth" />
                {error && <div className="error">{error}</div>}
                <div className="btns back">
                  <button type="button" className="btn ghost" onClick={() => setRestoring(false)}>Back</button>
                  <button className="btn" disabled={busy}>{busy ? "Checking…" : "Unlock"}</button>
                </div>
              </form>
            </TypedComm>
          </Hull>
        ) : (
          <>
            <RegisterQuest from={code} ownerName={owner.name} onRegistered={registered} />
            <button className="btn ghost small" onClick={() => setRestoring(true)}>This is my card</button>
          </>
        )}
      </div>
    );
  }

  // A fresh card, scanned by a pilot who registered from someone else's card.
  if (state === "claim" && me)
    return (
      <div className="stack">
        <Hull title="Unbound pass" code={code}>
          <TypedComm who="GRUMM" text={`A blank pass. Shall I bind it to you, ${me.name.split(" ")[0]}, and to your ${me.card.character}? Whoever scans it afterwards collects your Kin.`}>
            <div className="btns" style={{ marginTop: 14 }}>
              <button className="btn" disabled={busy} onClick={() => post("/api/claim", { tag: code })}>{busy ? "Binding…" : "Bind this card to me"}</button>
              {error && <div className="error">{error}</div>}
            </div>
          </TypedComm>
        </Hull>
        <LiveCard card={me.card} />
      </div>
    );

  if (state === "busy" && me)
    return (
      <div className="stack">
        <Hull title="Unbound pass" code={code} led="amber">
          <TypedComm who="GRUMM" text="This card has no traveler yet, and you already carry one. Hand it to its owner: they scan it with their own phone to bind it.">
            <div style={{ marginTop: 14 }}><NavButtons /></div>
          </TypedComm>
        </Hull>
      </div>
    );

  // Your own card.
  if (state === "own" && me)
    return (
      <div className="stack">
        <MyCharacter card={me.card}>
          <Hull title="Your pass" code={code}>
            <p style={{ marginTop: 0 }}>
              This is your card. Hold it out: every traveler who scans it adds <b>{me.card.character}</b> to their orbit.
              {me.card.collected_by ? ` Collected ${me.card.collected_by} time${me.card.collected_by === 1 ? "" : "s"} so far.` : ""}
            </p>
            <NavButtons />
          </Hull>
        </MyCharacter>
      </div>
    );

  // Someone else's card, scanned by a registered pilot: collected.
  if (state === "collected" && owner && me)
    return (
      <div className="stack">
        <div className={`banner ${newCollect ? "" : "info"}`}>{newCollect ? `+1 · Added to your orbit` : "Already in your orbit"}</div>
        <LiveCard card={owner} reveal={newCollect} />
        <Hull title="Your orbit" code={`${hold}/${Math.max(total - 1, hold)}`}>
          <p style={{ marginTop: 0 }}>
            {newCollect ? `${owner.name}'s ${owner.character} is now in your orbit.` : `You collected ${owner.name} earlier.`} <b>{hold}</b> of {Math.max(total - 1, hold)} Kin are in your orbit.
          </p>
          <NavButtons />
        </Hull>
        {me.card.status !== "done" && (
          <MyCharacter card={me.card} />
        )}
      </div>
    );

  return (
    <Hull title="Signal error" led="red">
      <p>The card could not be read. Scan it again.</p>
    </Hull>
  );
}
