"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Hull from "./Hull";

type Platform = "android-nfc" | "ios" | "other";
type Status = "idle" | "scanning" | "found" | "error";

const CODE_RE = /\/t\/([A-Za-z0-9_-]{3,40})(?:[/?#]|$)/;

// The pass scanner. A pass is an NFC tag holding https://…/t/<code>.
// - Android Chrome reads it right here with Web NFC (NDEFReader): press the button once, then any
//   tap opens that pass on this page. When the permission is already granted, it starts by itself.
// - iPhone reads NFC tags itself: hold the pass to the top edge and tap the banner that appears.
// - Anything else: the instructions only.
export default function NfcScan({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("other");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    setPlatform("NDEFReader" in window ? "android-nfc" : ios ? "ios" : "other");
    return () => abort.current?.abort();
  }, []);

  const start = useCallback(async () => {
    setError("");
    try {
      abort.current?.abort();
      abort.current = new AbortController();
      const reader = new (window as any).NDEFReader();
      reader.onreading = (event: any) => {
        for (const record of event.message.records) {
          if (record.recordType !== "url" && record.recordType !== "absolute-url" && record.recordType !== "text") continue;
          const value = new TextDecoder(record.encoding || "utf-8").decode(record.data);
          const m = value.match(CODE_RE);
          if (m) {
            setStatus("found");
            abort.current?.abort();
            router.push(`/t/${m[1]}`);
            return;
          }
        }
        setError("That tag is not a pass for The Future 2050.");
      };
      reader.onreadingerror = () => setError("Could not read the pass. Hold it still against the back of the phone.");
      await reader.scan({ signal: abort.current.signal });
      setStatus("scanning");
    } catch (e: any) {
      setStatus("error");
      setError(
        e?.name === "NotAllowedError"
          ? "The browser was not allowed to use NFC. Allow it in the site settings and try again."
          : e?.name === "NotSupportedError"
            ? "NFC is off. Turn it on in your phone's settings and try again."
            : "The scanner could not start. Hold the pass to the back of your phone anyway.",
      );
    }
  }, [router]);

  // Start straight away when the NFC permission was granted before.
  useEffect(() => {
    if (platform !== "android-nfc") return;
    (navigator as any).permissions
      ?.query({ name: "nfc" })
      .then((p: PermissionStatus) => p.state === "granted" && start())
      .catch(() => {});
  }, [platform, start]);

  const how =
    platform === "ios"
      ? "Hold your pass to the top edge of your iPhone, screen on. Tap the banner that appears."
      : platform === "android-nfc"
        ? status === "scanning"
          ? "Scanner on. Hold your pass flat against the back of your phone."
          : "Turn on the scanner, then hold your pass to the back of your phone."
        : "Tap your pass on the back of your phone. It opens the Station by itself.";

  return (
    <Hull title={signedIn ? "Pass scanner · meet someone" : "Pass scanner"} code={status === "scanning" ? "LIVE" : platform === "ios" ? "IPHONE" : platform === "android-nfc" ? "NFC" : "READY"} led={status === "error" ? "red" : status === "scanning" ? "green" : "amber"}>
      <div className={`nfc ${status} ${compact ? "compact" : ""}`}>
        <div className="nfc-anim" aria-hidden>
          <span className="ring r1" />
          <span className="ring r2" />
          <span className="ring r3" />
          <div className="nfc-phone"><i /></div>
          <div className="nfc-pass">K</div>
        </div>
        <h2 className="nfc-title">{signedIn ? "Tap their pass" : "Tap your pass"}</h2>
        <p className="nfc-how">{how}</p>
        {signedIn && <p className="small muted" style={{ margin: 0 }}>Every pass you tap puts that traveler’s Kin in your orbit.</p>}
        {platform === "android-nfc" && status !== "scanning" && status !== "found" && (
          <button className="btn glow" onClick={start}>Turn on the scanner</button>
        )}
        {status === "found" && <p className="mono small" style={{ margin: 0, color: "var(--green)" }}>PASS READ · OPENING…</p>}
        {error && <div className="error">{error}</div>}
      </div>
    </Hull>
  );
}
