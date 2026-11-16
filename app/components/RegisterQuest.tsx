"use client";
import Link from "next/link";
import { useState } from "react";
import Hull from "./Hull";
import { TypedComm } from "./Comm";
import { haptic } from "@/lib/haptics";
import { replyOf } from "@/lib/reply";

type Choice = { id: number; name: string; hint: string | null; taken: boolean };

// Registration as a text quest: the archivist asks your name, the cartographer your birthday, the
// oracle an email for logging back in (optional), and if the guest list holds several matches you
// pick yours.
export default function RegisterQuest({
  tag, from, ownerName, onRegistered,
}: { tag?: string; from?: string; ownerName?: string; onRegistered: (playerId: string) => void }) {
  const [step, setStep] = useState<"name" | "birthday" | "email" | "choose">("name");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [loginHint, setLoginHint] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const intro = from
    ? `That pass belongs to ${ownerName}. To put it in your orbit, the Station must know you first. State your name, traveler.`
    : "A fresh pass. Nobody has arrived on it yet. Before the Station seals it to you, state your name, traveler.";

  async function submit(guestId?: number | "none", withEmail = email) {
    setBusy(true);
    setError("");
    setLoginHint(false);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthday, email: withEmail.trim(), tag, from, ...(guestId !== undefined ? { guestId } : {}) }),
      });
      const j = await replyOf(res);
      if (j.login) setLoginHint(true);
      if (!res.ok) throw new Error(j.error || "The comm link failed. Try again.");
      if (j.choose) {
        setChoices(j.choose);
        setStep("choose");
        return;
      }
      onRegistered(j.playerId);
    } catch (e: any) {
      setError(e.message);
      haptic("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Hull title="Arrival Station · 2050" code={step === "name" ? "1/3" : step === "birthday" ? "2/3" : step === "email" ? "3/3" : "ARCHIVE"}>
      {step === "name" && (
        <TypedComm who="GRUMM" text={intro}>
          <form
            className="stack"
            style={{ marginTop: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) return setError("At least two letters, traveler.");
              setError("");
              setStep("birthday");
            }}
          >
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" className="input" autoFocus autoComplete="name" maxLength={60} placeholder="First and last name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn" type="submit">Transmit</button>
          </form>
        </TypedComm>
      )}

      {step === "birthday" && (
        <TypedComm who="VEXA" text={`Welcome, ${name.trim().split(" ")[0]}. Now the date your star first lit up. Give me your birthday and I will read the sky of that night.`}>
          <form
            className="stack"
            style={{ marginTop: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!birthday) return setError("The stars need a date.");
              setError("");
              setStep("email");
            }}
          >
            <div className="field">
              <label htmlFor="bday">Date of birth</label>
              <input id="bday" className="input" type="date" required min="1920-01-01" max={new Date().toISOString().slice(0, 10)} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="btns back">
              <button className="btn ghost" type="button" onClick={() => setStep("name")} disabled={busy}>Back</button>
              <button className="btn" type="submit" disabled={busy}>Next</button>
            </div>
          </form>
        </TypedComm>
      )}

      {step === "email" && (
        <TypedComm who="ILU" text={`One more thing, ${name.trim().split(" ")[0]}. Leave me an email. If you ever change phones, the Station sends you a code and you are back in a heartbeat. Nobody else sees it.`}>
          <form
            className="stack"
            style={{ marginTop: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && (
              <div className="error">
                {error} {loginHint && <Link href="/app/login">Log in</Link>}
              </div>
            )}
            <div className="btns back">
              <button className="btn ghost" type="button" onClick={() => setStep("birthday")} disabled={busy}>Back</button>
              <button className="btn" type="submit" disabled={busy || !email.trim()}>{busy ? "Linking…" : "Read my stars"}</button>
            </div>
            <button className="btn ghost small" type="button" disabled={busy} onClick={() => { setEmail(""); submit(undefined, ""); }}>
              Skip, no email
            </button>
          </form>
        </TypedComm>
      )}

      {step === "choose" && (
        <TypedComm
          who="GRUMM"
          text={
            choices.length > 1
              ? "Hmph. My archive holds more than one record that sounds like you. Which one is yours?"
              : choices[0]?.taken
                ? `My archive already bound a card to ${choices[0].name}. If that is you on a new phone, scan your own card and choose “This is my card”. Otherwise, who are you?`
                : "Hmph. One record in my archive sounds like you. Is this you?"
          }
        >
          <ol className="choices">
            {choices.map((c, i) => (
              <li key={c.id}>
                <button data-haptic="success" disabled={busy} onClick={() => submit(c.id)}>
                  <span className="n">{i + 1}.</span>
                  {c.name} {c.hint && <span className="hint">· {c.hint}</span>}
                  {c.taken && <span className="hint"> · already has a card</span>}
                </button>
              </li>
            ))}
            <li>
              <button disabled={busy} onClick={() => submit("none")}>
                <span className="n">{choices.length + 1}.</span>None of these. I am a new arrival.
              </button>
            </li>
          </ol>
          {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
        </TypedComm>
      )}
    </Hull>
  );
}
