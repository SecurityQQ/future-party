"use client";
import { useEffect, useState } from "react";
import { GLYPH } from "@/lib/zodiac";

type Pilot = { name: string; sign: string; card_no: number } | null;

// Updates itself when a pilot registers or restores on this page (event "zr:pilot").
export default function PilotChip({ initial }: { initial: Pilot }) {
  const [me, setMe] = useState<Pilot>(initial);
  useEffect(() => setMe(initial), [initial]);
  useEffect(() => {
    const load = () => fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then(setMe).catch(() => {});
    window.addEventListener("zr:pilot", load);
    return () => window.removeEventListener("zr:pilot", load);
  }, []);
  if (!me)
    return (
      <a className="pilot-chip" href="/app/login">
        LOG IN<br /><span className="muted">WITH EMAIL</span>
      </a>
    );
  // Your name opens your profile.
  return (
    <a className="pilot-chip" href="/app/me/profile" aria-label={`${me.name}: your profile`}>
      {GLYPH[me.sign]}{"\uFE0E"} {me.name} ›<br /><span className="muted">PROFILE · № {String(me.card_no).padStart(3, "0")}</span>
    </a>
  );
}
