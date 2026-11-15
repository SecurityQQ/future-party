"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicCard } from "@/lib/db";
import AstroLoader from "./AstroLoader";
import { CharacterCard } from "./CharacterCard";
import Hull from "./Hull";

// used: redraws spent (one is allowed); hasPrev: the other version is kept and can be switched back.
export type RedrawState = { used: number; hasPrev: boolean };

// Your own Kin: the oracles' loader while it materializes, then the reveal. With `redraw`, the
// traveler can redraw it once with notes on what to change, and switch between the two versions.
export default function MyCharacter({ card, redraw, children }: { card: PublicCard; redraw?: RedrawState; children?: React.ReactNode }) {
  const [shown, setShown] = useState<PublicCard | null>(card.status === "done" ? card : null);
  const [flash, setFlash] = useState(false);
  const [r, setR] = useState<RedrawState | undefined>(redraw);
  // The redraw request in flight (resolves to an error message, or null when the job started).
  const [redrawing, setRedrawing] = useState<Promise<string | null> | null>(null);

  const reveal = (c: PublicCard) => {
    setFlash(true);
    setShown({ ...card, ...c, collected_by: card.collected_by });
    setTimeout(() => setFlash(false), 1200);
  };

  if (!shown) return <AstroLoader playerId={card.id} sign={card.sign} onReveal={reveal} />;
  if (redrawing)
    return (
      <Redrawing
        card={shown}
        request={redrawing}
        onDone={(c) => {
          setRedrawing(null);
          setR({ used: 1, hasPrev: true });
          reveal(c);
        }}
        onKeepFirst={(c) => {
          setRedrawing(null);
          setR({ used: 1, hasPrev: false });
          setShown({ ...shown, ...c });
        }}
        onCancel={() => {
          setRedrawing(null);
          setR(redraw ?? { used: 0, hasPrev: false });
        }}
      />
    );
  return (
    <>
      {flash && <div className="flash" />}
      <CharacterCard card={shown} reveal={flash} />
      {r && (
        <RedrawPanel
          id={card.id}
          state={r}
          onStart={(feedback) => {
            setR({ used: r.used + 1, hasPrev: true });
            // Switch to the redraw screen at once; starting the image job can take ~10 s.
            setRedrawing(
              fetch(`/api/players/${card.id}/redraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }) })
                .then(async (res) => (res.ok ? null : ((await res.json().catch(() => ({}))).error as string) || "The comm link failed. Try again."))
                .catch(() => "The comm link failed. Try again."),
            );
          }}
          onSwap={(c) => setShown({ ...shown, ...c })}
        />
      )}
      {children}
    </>
  );
}

function RedrawPanel({ id, state, onStart, onSwap }: { id: string; state: RedrawState; onStart: (feedback: string) => void; onSwap: (c: PublicCard) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/players/${id}/redraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "The comm link failed. Try again.");
      return j;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (state.used >= 1) {
    if (!state.hasPrev) return null;
    return (
      <div className="stack" style={{ gap: 6 }}>
        <button className="btn ghost small" disabled={busy} onClick={async () => { const j = await post({ swap: true }); if (j) onSwap(j); }}>
          {busy ? "Switching…" : "Switch to the other version"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        Not quite your Kin? Redraw it once
      </button>
    );

  return (
    <Hull title="Redraw your Kin" code="1 LEFT" led="amber">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (text.trim().length < 3) return setError("Tell the oracles what to change.");
          onStart(text.trim());
        }}
      >
        <div className="field">
          <label htmlFor="feedback">What should change?</label>
          <textarea
            id="feedback"
            className="input area"
            rows={3}
            maxLength={400}
            autoFocus
            placeholder="e.g. less cute, more cosmic; make it a fox; darker colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <p className="small muted" style={{ margin: 0 }}>The oracles redraw your Kin once with your notes. You can switch back to this version afterwards.</p>
        {error && <div className="error">{error}</div>}
        <div className="btns back">
          <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>Back</button>
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Redraw"}</button>
        </div>
      </form>
    </Hull>
  );
}

const EXPECTED_MS = 40_000;

// The redraw in progress: the card shows "materializing" until the new picture is stored. Polling
// starts only once the request has been accepted, so the old picture is never taken for the new one.
function Redrawing({ card, request, onDone, onKeepFirst, onCancel }: {
  card: PublicCard; request: Promise<string | null>; onDone: (c: PublicCard) => void; onKeepFirst: (c: PublicCard) => void; onCancel: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [refused, setRefused] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(Date.now());
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let alive = true;
    request.then((err) => alive && (err ? setRefused(err) : setSent(true)));
    return () => { alive = false; };
  }, [request]);

  useEffect(() => {
    if (!sent) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const j = await (await fetch(`/api/players/${card.id}`, { cache: "no-store" })).json();
        if (!alive) return;
        if (j.status === "done" && j.image_url) return done.current(j);
        if (j.status === "failed") return setFailed(true);
      } catch {}
      if (alive) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 2500);
    return () => { alive = false; clearTimeout(timer); };
  }, [sent, card.id]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(clock);
  }, []);

  const pct = Math.round(Math.min(96, 6 + ((now - started.current) / EXPECTED_MS) * 90));
  async function keepFirst() {
    setBusy(true);
    const res = await fetch(`/api/players/${card.id}/redraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ swap: true }) });
    const j = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && j) onKeepFirst(j);
  }

  return (
    <div className="stack">
      <CharacterCard card={{ ...card, image_url: null, status: failed ? "failed" : "generating" }} />
      <Hull title="Redrawing your Kin" code={failed ? "ERR" : `${pct}%`} led={failed ? "red" : "amber"}>
        <div className="bar-label">
          <span>{failed ? "Signal lost" : "Materializing"}</span>
          <span>{failed ? "" : `${pct}%`}</span>
        </div>
        <div className="bar"><i style={{ ["--p" as any]: `${failed ? 0 : pct}%` }} /></div>
        {refused ? (
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            <p className="error" style={{ margin: 0 }}>{refused}</p>
            <button className="btn ghost" onClick={onCancel}>Back</button>
          </div>
        ) : failed ? (
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            <p className="error" style={{ margin: 0 }}>The forge misfired on the redraw.</p>
            <button className="btn" disabled={busy} onClick={keepFirst}>{busy ? "Restoring…" : "Keep the first version"}</button>
          </div>
        ) : (
          <p className="small muted" style={{ marginBottom: 0 }}>The oracles are redrawing your Kin with your notes. About half a minute.</p>
        )}
      </Hull>
    </div>
  );
}
