"use client";
import { useEffect, useState } from "react";
import Hull from "./Hull";

// The traveler's public link (/c/<card number>) with a QR code: whoever scans it or opens the link
// sees this Kin and can become friends.
export default function SharePanel({ url, qr, title }: { url: string; qr: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <Hull title="Share your Kin" code="QR">
      <div className="share">
        <div className="qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="stack" style={{ gap: 10, alignContent: "start" }}>
          <p style={{ margin: 0 }}>Anyone who scans this code or opens your link sees your Kin and can become your friend.</p>
          <a className="share-url mono" href={url}>{url.replace(/^https?:\/\//, "")}</a>
          <div className={`btns ${canShare ? "two" : ""}`}>
            {canShare && <button className="btn" onClick={() => navigator.share({ title, url }).catch(() => {})}>Share</button>}
            <button className={`btn ${canShare ? "ghost" : ""}`} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          </div>
        </div>
      </div>
    </Hull>
  );
}
