"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Links } from "@/lib/db";
import { ASK_MAX, BIO_MAX, LINKS } from "@/lib/profile";
import Hull from "./Hull";

type Initial = { name: string; email: string; bio: string; ask_me: string; links: Links };

// The optional profile: everything here is up to the traveler, and all of it except the email
// shows on their card page.
export default function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Initial, v: string) => setF((x) => ({ ...x, [k]: v }));
  const setLink = (k: keyof Links, v: string) => setF((x) => ({ ...x, links: { ...x.links, [k]: v } }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not save. Try again.");
      window.dispatchEvent(new Event("zr:pilot"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <Hull title="About you" code="ON YOUR CARD">
        <div className="stack" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="p-name">Name</label>
            <input id="p-name" className="input" maxLength={60} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-bio">About you <span className="count">{f.bio.length}/{BIO_MAX}</span></label>
            <textarea id="p-bio" className="input area" rows={3} maxLength={BIO_MAX} placeholder="What you do, what you're building, what brought you here" value={f.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-ask">Ask me about <span className="count">{f.ask_me.length}/{ASK_MAX}</span></label>
            <input id="p-ask" className="input" maxLength={ASK_MAX} placeholder="longevity, synths, Mars" value={f.ask_me} onChange={(e) => set("ask_me", e.target.value)} />
          </div>
        </div>
      </Hull>

      <Hull title="Links" code="ON YOUR CARD">
        <div className="stack" style={{ gap: 12 }}>
          {LINKS.map((l) => (
            <div className="field" key={l.key}>
              <label htmlFor={`p-${l.key}`}>{l.label}</label>
              <input id={`p-${l.key}`} className="input" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={l.hint} value={f.links[l.key] ?? ""} onChange={(e) => setLink(l.key, e.target.value)} />
            </div>
          ))}
        </div>
      </Hull>

      <Hull title="Login email" code="PRIVATE">
        <div className="field">
          <label htmlFor="p-email">Email</label>
          <input id="p-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Never shown to anyone. This is how you log in on any phone: enter it and we email you a six-digit code. No password.</p>
      </Hull>

      {error && <div className="error">{error}</div>}
      {saved && <div className="banner info">Saved</div>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
