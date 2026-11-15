"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Hull from "./Hull";

export type FriendState = "anon" | "none" | "friends";

// On someone else's card page: one tap and you are friends (both ways). A visitor without a
// traveler on this phone is asked to scan their pass or log in first.
export default function FriendButton({ target, name, initial, back }: { target: string; name: string; initial: FriendState; back: string }) {
  const router = useRouter();
  const [state, setState] = useState<FriendState>(initial);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = name.split(" ")[0];

  async function befriend() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: target }) });
      const j = await res.json();
      if (res.status === 401) return setState("anon"), setAsk(true);
      if (!res.ok) throw new Error(j.error || "The comm link failed. Try again.");
      setState("friends");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (state === "friends") return <div className="banner info">Friends with {first}</div>;

  if (state === "anon" && ask)
    return (
      <Hull title="Who are you?" led="amber">
        <p style={{ marginTop: 0 }}>To become friends with {first}, the Station needs to know you first. Tap your pass on your phone, or log in with your email.</p>
        <div className="btns two">
          <Link className="btn" href="/scan">Scan my pass</Link>
          <Link className="btn ghost" href={`/login?next=${encodeURIComponent(back)}`}>Log in</Link>
        </div>
      </Hull>
    );

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn glow" disabled={busy} onClick={() => (state === "anon" ? setAsk(true) : befriend())}>
        {busy ? "Connecting…" : "Become friends"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
