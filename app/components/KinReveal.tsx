"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLYPH } from "@/lib/zodiac";
import { LOOKS, loadLogo, startEngine, type Settings } from "./glass-engine";

// The moment someone joins your orbit (a pass, a QR code or "Become friends"): a drop of glass lands
// on the screen, spreads into a tile, carries their Kin in under its rim in colour, then lets go and
// leaves the Kin's portrait. The glass is the reveal of animation.txt (components/glass-engine.ts).
const SPACE = "#030817";
const SETTINGS: Settings = {
  ...LOOKS.dark,
  background: SPACE,
  plateColor: "#07132b",
  logoColor: "#9dd8ff",
  originalColors: true,
  iconPlate: true,
  tileSize: 380,
  logoScale: 0.95,
  finalScale: 1.12,
  startZoom: 1.9,
  present: 2.2,
  hold: 1,
};
const TEXT_AT_MS = 2300;

// The Kin's picture cut into a circle on a transparent square: the glass reads the circle as the shape
// and keeps the picture's own colours inside it.
async function portrait(src: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("picture"));
    i.src = src;
  });
  const N = 640;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.arc(N / 2, N / 2, N / 2 - 2, 0, Math.PI * 2);
  g.clip();
  // Cover the square; the Kin sits in the upper middle of a portrait picture.
  const s = Math.max(N / img.naturalWidth, N / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  g.drawImage(img, (N - w) / 2, Math.min(0, (N - h) * 0.35), w, h);
  return c.toDataURL("image/png"); // throws if the picture is not CORS-clean; the caller falls back
}

// A Kin still materializing has no picture yet: the glass carries a four-pointed star instead.
const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M50 2C53 36 64 47 98 50C64 53 53 64 50 98C47 64 36 53 2 50C36 47 47 36 50 2Z"/></svg>`;

export default function KinReveal({ image, sign, kicker, title, line, onClose }: {
  image: string | null; sign?: string; kicker: string; title: string; line: string; onClose: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [text, setText] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const live = { current: { settings: image ? SETTINGS : { ...SETTINGS, originalColors: false }, loop: false, speed: 1 } };
    const engine = startEngine(el, live as any);
    if (!engine) return setFallback(true);
    let alive = true;
    (image ? portrait(image) : Promise.resolve(STAR))
      .then((logo) => loadLogo(logo))
      .then((data) => alive && engine.setLogo(data))
      .catch(() => alive && setFallback(true));
    return () => {
      alive = false;
      engine.dispose();
    };
  }, [image, sign]);

  useEffect(() => {
    const t = setTimeout(() => setText(true), fallback ? 700 : TEXT_AT_MS);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [fallback]);

  // On <body>: inside the page shell the fixed deck would stay on top of it.
  return createPortal(
    <div className="kin-reveal" role="dialog" aria-modal="true" aria-label={`${kicker}: ${title}`} onClick={() => text && onClose()}>
      <div className="kin-reveal-stage" ref={wrap}>
        {fallback &&
          (image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kin-reveal-still" src={image} alt="" />
          ) : (
            <span className="kin-reveal-still glyph">{sign ? GLYPH[sign] : "✦"}</span>
          ))}
      </div>
      <div className={`kin-reveal-text ${text ? "on" : ""}`}>
        <p className="mono kicker">{kicker}</p>
        <h2>{title}</h2>
        <p className="line">{line}</p>
        <button className="btn" onClick={onClose}>Continue</button>
      </div>
    </div>,
    document.body,
  );
}
