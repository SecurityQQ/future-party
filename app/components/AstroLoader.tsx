"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Hull from "./Hull";
import { ASTROLOGERS, parseReading, type Segment } from "@/lib/astrologers";
import { GLYPH } from "@/lib/zodiac";
import type { PublicCard } from "@/lib/db";
import { finishLabel } from "@/lib/finish";

type CardState = PublicCard & { own?: boolean; error?: string | null };

const EXPECTED_MS = 50_000;
const LOCAL_FALLBACK =
  "VEXA: The sky over your birthday is crowded with good omens, traveler.\nGRUMM: Hmph. The archive is slow tonight, but your companion is already on its way.\nILU: A bright year folds open for you in 2050.\nPROPHECY: Some stars arrive fashionably late.";

// A small constellation for the sign, drawn line by line (deterministic per sign).
function StarChart({ sign }: { sign: string }) {
  const pts = useMemo(() => {
    let s = [...sign].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    return Array.from({ length: 7 }, (_, i) => ({ x: 30 + i * 45 + rnd() * 20, y: 20 + rnd() * 80 }));
  }, [sign]);
  return (
    <svg className="chart" viewBox="0 0 340 120" aria-hidden>
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i % 3 ? 1.8 : 2.8} style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      <text x="320" y="112" textAnchor="end" fill="var(--cyan)" opacity="0.6" fontSize="26">{GLYPH[sign]}</text>
    </svg>
  );
}

// The loader: three oracles read your stars (streamed from the model) while the image job runs.
export default function AstroLoader({ playerId, sign, onReveal }: { playerId: string; sign: string; onReveal: (card: CardState) => void }) {
  const [raw, setRaw] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const [shown, setShown] = useState(0);
  const [card, setCard] = useState<CardState | null>(null);
  const [nonce, setNonce] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(Date.now());

  // 1. The reading, streamed.
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch("/api/reading", { method: "POST" });
        if (!res.ok || !res.body) throw new Error("no reading");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done || stop) break;
          setRaw((r) => r + dec.decode(value, { stream: true }));
        }
      } catch {
        if (!stop) setRaw((r) => r || LOCAL_FALLBACK);
      } finally {
        if (!stop) setStreamDone(true);
      }
    })();
    return () => { stop = true; };
  }, []);

  // 2. The image job, polled.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(`/api/players/${playerId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (j?.id) setCard(j);
        if (j.status === "done" || j.status === "failed") return;
      } catch {}
      if (alive) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 1200);
    return () => { alive = false; clearTimeout(timer); };
  }, [playerId, nonce]);

  // 3. Typing and the clock.
  const segments: Segment[] = useMemo(() => parseReading(raw).filter((s) => s.who !== "PROPHECY"), [raw]);
  const total = segments.reduce((a, s) => a + s.text.length, 0);
  const totalRef = useRef(0);
  totalRef.current = total;
  useEffect(() => {
    const t = setInterval(() => {
      setShown((s) => Math.min(s + 2, totalRef.current));
      setNow(Date.now());
    }, 55);
    return () => clearInterval(t);
  }, []);

  let left = shown, current = 0;
  for (; current < segments.length - 1 && left > segments[current].text.length; current++) left -= segments[current].text.length;
  const seg = segments[current];
  const typingDone = streamDone && shown >= total && total > 0;
  const done = card?.status === "done";
  const failed = card?.status === "failed";
  const elapsed = now - started.current;
  const pct = done ? 100 : Math.min(96, 6 + (elapsed / EXPECTED_MS) * 90);
  const prophecy = parseReading(raw).find((s) => s.who === "PROPHECY")?.text;

  const lines = [
    "Comm link to the oracles of 2050: open",
    `Birth sky locked: ${sign}`,
    "Archive query: guest records of The Future Party",
    card ? `Companion assigned: ${card.character}` : "Searching companion registry…",
    card ? `Finish: ${finishLabel(card.style)}` : "Calibrating finish…",
    "Folding your Kin into three dimensions",
    "Polishing whiskers and rim light",
    "Stabilizing hologram",
  ];
  const visible = lines.slice(0, Math.min(lines.length, 2 + Math.floor(elapsed / 4500)));

  // The reading box has a fixed height: earlier lines scroll up inside it, so the panels below
  // never move while the oracles type.
  type Who = keyof typeof ASTROLOGERS;
  const who = (seg?.who ?? "VEXA") as Who;
  const speaker = ASTROLOGERS[who];
  const typed = seg ? seg.text.slice(0, Math.max(0, left)) : "Tuning the comm array to your birth sky…";
  const logRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [typed, current]);

  async function retry() {
    await fetch(`/api/players/${playerId}/retry`, { method: "POST" });
    started.current = Date.now();
    setCard((c) => (c ? { ...c, status: "generating" } : c));
    setNonce((n) => n + 1);
  }

  return (
    <div className="stack">
      <Hull title="Oracles of 2050 · Live reading" code={`${Math.round(pct)}%`} led={failed ? "red" : done ? "green" : "amber"}>
        <div className="comm reading" style={{ ["--speaker" as any]: speaker.color }} onClick={() => setShown(total)} role="presentation">
          <div className="portrait talking swap" key={who}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={speaker.img} alt={speaker.name} />
          </div>
          <div className="reading-col">
            <div className="speaker">
              {speaker.name}
              <small>{speaker.title}</small>
            </div>
            <div className={`reading-log ${overflow ? "overflow" : ""}`} ref={logRef}>
              {segments.slice(0, current).map((s, i) => {
                const o = ASTROLOGERS[s.who as Who];
                return (
                  <p key={i} className="past">
                    <b style={{ color: o?.color }}>{o?.name}</b> {s.text}
                  </p>
                );
              })}
              <p className="now">
                {typed}
                {!typingDone && <span className="caret" />}
              </p>
            </div>
          </div>
        </div>
      </Hull>

      <Hull title="Kin synthesis" code={sign.toUpperCase()} led={failed ? "red" : "amber"}>
        <StarChart sign={sign} />
        <div className="bar-label">
          <span>{failed ? "Signal lost" : done ? "Ready" : "Materializing"}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="bar"><i style={{ ["--p" as any]: `${pct}%` }} /></div>
        <div className="log fixed" style={{ marginTop: 10 }}>
          {visible.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        {/* The button holds its place from the start, so the panel does not grow when the Kin is ready. */}
        <div className="reveal-slot">
          {failed ? (
            <div className="stack" style={{ gap: 10 }}>
              <p className="error" style={{ margin: 0 }}>The image forge misfired. The oracles can try again.</p>
              <button className="btn" onClick={retry}>Try again</button>
            </div>
          ) : (
            <button
              className={`btn ${done ? "glow" : ""}`}
              disabled={!done}
              onClick={() => onReveal({ ...card!, prophecy: card!.prophecy ?? prophecy ?? null })}
            >
              {done ? (typingDone ? "Reveal your Kin" : "Skip to your Kin") : "Materializing…"}
            </button>
          )}
        </div>
      </Hull>
    </div>
  );
}
