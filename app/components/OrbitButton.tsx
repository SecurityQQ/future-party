"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrbitState } from "@/lib/orbit";
import { haptic } from "@/lib/haptics";
import Hull from "./Hull";
import KinReveal from "./KinReveal";
import { replyOf } from "@/lib/reply";

type Kin = { image: string | null; character: string; sign: string };

export async function orbitCall(id: string, action: string): Promise<{ state: OrbitState; connected?: boolean }> {
  const res = await fetch("/api/orbit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
  const j = await replyOf(res);
  if (!res.ok) throw new Error(j.error || "The comm link failed. Try again.");
  return j;
}

// On someone else's card page, the one way to connect when their pass isn't at hand: an orbit request
// they approve. Their pass or QR adds them at once. Once they're in your orbit, a small link takes
// them out again.
export default function OrbitButton({ target, name, initial, back, kin, signedIn }: {
  target: string; name: string; initial: OrbitState; back: string; kin: Kin; signedIn: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<OrbitState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [reveal, setReveal] = useState(false);
  const first = name.split(" ")[0];

  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      const j = await orbitCall(target, action);
      setState(j.state);
      setConfirm(false);
      if (j.connected) setReveal(true);
      else router.refresh();
    } catch (e: any) {
      setError(e.message);
      haptic("error");
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn)
    return (
      <Hull title={`Add ${first} to your orbit`} led="amber">
        <p style={{ marginTop: 0 }}>Log in with your email first (no password, we send you a code). Then tap {first}’s pass or scan their QR code, or send an orbit request.</p>
        <div className="btns two">
          <Link className="btn" href={`/app/login?next=${encodeURIComponent(back)}`}>Log in with email</Link>
          <Link className="btn ghost" href="/app/scan">New here? Get a Kin</Link>
        </div>
      </Hull>
    );

  const err = error && <div className="error">{error}</div>;

  if (state === "orbit")
    return (
      <div className="stack" style={{ gap: 6 }}>
        {reveal && (
          <KinReveal
            image={kin.image}
            sign={kin.sign}
            kicker="+1 · IN YOUR ORBIT"
            title={kin.character}
            line={`You and ${first} are in each other’s orbit now.`}
            onClose={() => {
              setReveal(false);
              router.refresh();
            }}
          />
        )}
        <div className="banner info">In your orbit</div>
        {confirm ? (
          <div className="orbit-remove">
            <span>Take {first}’s Kin out of your orbit?</span>
            <button className="link-btn" disabled={busy} onClick={() => act("remove")}>{busy ? "Removing…" : "Remove"}</button>
            <button className="link-btn" disabled={busy} onClick={() => setConfirm(false)}>Keep</button>
          </div>
        ) : (
          <button className="link-btn quiet" onClick={() => setConfirm(true)}>Remove from orbit</button>
        )}
        {err}
      </div>
    );

  if (state === "incoming")
    return (
      <Hull title={`${first} wants to join orbits`} led="amber">
        <p style={{ marginTop: 0 }}>Approve and each Kin joins the other’s orbit.</p>
        <div className="btns two">
          <button className="btn" data-haptic="kin" disabled={busy} onClick={() => act("approve")}>{busy ? "…" : "Approve"}</button>
          <button className="btn ghost" disabled={busy} onClick={() => act("decline")}>Decline</button>
        </div>
        {err}
      </Hull>
    );

  if (state === "sent")
    return (
      <div className="stack" style={{ gap: 6 }}>
        <div className="banner info">Request sent · waiting for {first}</div>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          Next to {first}? Tap their pass or scan their QR and you’re in at once.{" "}
          <button className="link-btn" disabled={busy} onClick={() => act("cancel")}>Cancel request</button>
        </p>
        {err}
      </div>
    );

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn glow" data-haptic="success" disabled={busy} onClick={() => act("request")}>{busy ? "Sending…" : "Send orbit request"}</button>
      <p className="small muted" style={{ margin: 0, textAlign: "center" }}>{first} approves it and each Kin joins the other’s orbit. Next to them? Tap their pass or scan their QR instead: that adds them at once.</p>
      {err}
    </div>
  );
}
