"use client";
import { useEffect, useState } from "react";
import type { PublicCard } from "@/lib/db";
import { CharacterCard } from "./CharacterCard";
import { useKinClip } from "./KinClip";

// A card that keeps checking until its Kin has materialized, and then until its clip is ready.
export default function LiveCard({ card: initial, reveal, children }: { card: PublicCard; reveal?: boolean; children?: React.ReactNode }) {
  const [card, setCard] = useState(initial);
  useEffect(() => setCard(initial), [initial]);
  useEffect(() => {
    if (card.status === "done" || card.status === "failed") return;
    const t = setTimeout(async () => {
      try {
        const j = await (await fetch(`/api/players/${card.id}`, { cache: "no-store" })).json();
        if (j?.id) setCard((c) => ({ ...c, ...j, collected_by: c.collected_by }));
      } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [card]);
  const clip = useKinClip(card);
  return <CharacterCard card={{ ...card, video_url: clip.url }} reveal={reveal}>{children}</CharacterCard>;
}
