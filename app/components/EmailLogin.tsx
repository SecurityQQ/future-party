"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Hull from "./Hull";
import { Comm } from "./Comm";
import { haptic } from "@/lib/haptics";

// Log back in on any phone: email -> six-digit code from the email -> signed in. The link in the
// email opens /login?email=..&code=.. and signs in by itself (the POST runs in the page, so mail
// scanners that pre-open links cannot use up the code).
export default function EmailLogin({
  initialEmail = "", initialCode = "", next = "/app", title = "Log in with email", intro, autoFocus = true,
}: { initialEmail?: string; initialCode?: string; next?: string; title?: string; intro?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">(initialCode ? "code" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const auto = useRef(false);

  async function call(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "The comm link failed. Try again.");
    return j;
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const j = await call("/api/auth/send", { email });
      setDevCode(j.devCode ?? "");
      setCode("");
      setStep("code");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e = email, c = code) {
    setBusy(true);
    setError("");
    try {
      await call("/api/auth/verify", { email: e, code: c });
      haptic("success");
      window.dispatchEvent(new Event("zr:pilot"));
      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      haptic("error");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (auto.current || !initialEmail || initialCode.length !== 6) return;
    auto.current = true;
    verify(initialEmail, initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Hull title={title} code={step === "email" ? "EMAIL · 1/2" : "EMAIL · 2/2"} led="green">
      {step === "email" ? (
        <Comm who="GRUMM" text={intro ?? "Already a traveler? Give me the email you left at the Station and I send you a six-digit code. No password."}>
          <form className="stack" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoFocus={autoFocus} required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn" disabled={busy}>{busy ? "Sending…" : "Email me a login code"}</button>
          </form>
        </Comm>
      ) : (
        <Comm who="ILU" text={`A code is on its way to ${email}. It works for fifteen minutes.`}>
          <form className="stack" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <div className="field">
              <label htmlFor="login-code">Six-digit code</label>
              <input
                id="login-code"
                className="input code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                required
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            {devCode && <p className="small muted" style={{ margin: 0 }}>Test mode, no email service yet: your code is <b className="mono">{devCode}</b>.</p>}
            {error && <div className="error">{error}</div>}
            <button className="btn" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Log in"}</button>
            <div className="btns two">
              <button type="button" className="btn ghost small" disabled={busy} onClick={send}>Send again</button>
              <button type="button" className="btn ghost small" disabled={busy} onClick={() => { setStep("email"); setError(""); }}>Other email</button>
            </div>
          </form>
        </Comm>
      )}
    </Hull>
  );
}
