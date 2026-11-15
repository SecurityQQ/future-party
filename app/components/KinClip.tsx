"use client";
import { useEffect, useState } from "react";
import type { PublicCard } from "@/lib/db";

// The Kin's H3 clip over its picture. The picture stays visible until the clip actually plays, so
// a slow load, Low Power Mode (no autoplay) or reduced motion just leave the still card.
export function KinClip({ src }: { src: string }) {
  const [on, setOn] = useState(false);
  return (
    <video
      className={`kin-clip ${on ? "on" : ""}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onPlaying={() => setOn(true)}
    />
  );
}

export type ClipState = { url: string | null; pending: boolean };

// A finished card's clip: keeps asking until it is stored (about 90 s after the picture), then
// stops. Each ask also moves the clip forward on the server, so cards drawn before clips existed
// get theirs the first time someone opens them.
export function useKinClip(card: PublicCard | null): ClipState {
  const id = card?.id;
  const image = card?.status === "done" ? card.image_url : null;
  const [clip, setClip] = useState<ClipState>({ url: card?.video_url ?? null, pending: !card?.video_url });

  useEffect(() => setClip({ url: card?.video_url ?? null, pending: !card?.video_url }), [id, image, card?.video_url]);

  useEffect(() => {
    if (!id || !image || clip.url || !clip.pending) return;
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const j = await (await fetch(`/api/players/${id}`, { cache: "no-store" })).json();
        if (!alive) return;
        if (j.image_url !== image) return; // the picture changed; the card brings its own clip
        if (j.video_url) return setClip({ url: j.video_url, pending: false });
        if (j.video === "failed") return setClip({ url: null, pending: false });
      } catch {}
      if (alive && ++tries < 60) timer = setTimeout(tick, 5000);
      else if (alive) setClip({ url: null, pending: false });
    };
    timer = setTimeout(tick, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, image, clip.url, clip.pending]);

  return clip;
}
