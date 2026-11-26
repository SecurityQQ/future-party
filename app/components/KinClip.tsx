"use client";
import { useState } from "react";

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
