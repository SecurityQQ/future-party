"use client";
import { useEffect, useState } from "react";
import type { PublicCard } from "@/lib/db";
import { CharacterCard } from "./CharacterCard";

// A card that keeps checking until its Kin has materialized.
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
  return <CharacterCard card={card} reveal={reveal}>{children}</CharacterCard>;
}
