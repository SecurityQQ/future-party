"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicCard } from "@/lib/db";
import { haptic } from "@/lib/haptics";
import Hull from "./Hull";
import KinReveal from "./KinReveal";
import { orbitCall } from "./OrbitButton";

// On My Kin: travelers who asked to join orbits with you. Approve plays the glass reveal of their Kin.
export default function OrbitRequests({ requests }: { requests: PublicCard[] }) {
  const router = useRouter();
  const [left, setLeft] = useState(requests);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<PublicCard | null>(null);
  if (!left.length && !reveal) return null;

  async function answer(c: PublicCard, action: "approve" | "decline") {
    setBusy(c.id);
    setError("");
    try {
      await orbitCall(c.id, action);
      setLeft((l) => l.filter((x) => x.id !== c.id));
      if (action === "approve") setReveal(c);
    } catch (e: any) {
      setError(e.message);
      haptic("error");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {reveal && (
        <KinReveal
          image={reveal.image_url}
          sign={reveal.sign}
          kicker="+1 · IN YOUR ORBIT"
          title={reveal.character}
          line={`You and ${reveal.name.split(" ")[0]} are in each other’s orbit now.`}
          onClose={() => {
            setReveal(null);
            router.refresh();
          }}
        />
      )}
      {left.length > 0 && (
        <Hull title="Orbit requests" code={`${left.length}`} led="amber">
          <ul className="requests">
            {left.map((c) => (
              <li key={c.id}>
                <Link className="face" href={`/app/c/${c.card_no}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image_url ? <img src={c.image_url} alt="" /> : null}
                </Link>
                <span className="who"><b>{c.name}</b><span>{c.character}</span></span>
                <span className="acts">
                  <button className="btn small" data-haptic="kin" disabled={!!busy} onClick={() => answer(c, "approve")}>{busy === c.id ? "…" : "Approve"}</button>
                  <button className="btn ghost small" disabled={!!busy} onClick={() => answer(c, "decline")}>Decline</button>
                </span>
              </li>
            ))}
          </ul>
          {error && <div className="error">{error}</div>}
        </Hull>
      )}
    </>
  );
}
