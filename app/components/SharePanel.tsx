"use client";
import { useEffect, useState } from "react";
import Hull from "./Hull";

// The traveler's QR code and public link. The QR is the same link as their pass (/app/t/<code>): whoever
// scans it collects this Kin, logging in or joining first. The link (/c/<card number>) shows the Kin and
// lets people become friends. "Post on X" writes the post for them; the link's card
// (app/app/app/c/[id]/card) shows the Kin, so the post needs no picture of its own.
export default function SharePanel({ url, qr, title, character }: { url: string; qr: string; title: string; character: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const post = `https://x.com/intent/post?text=${encodeURIComponent(`My Kin for 2050: ${character}. Met at Varga Future Party by @vargastartup`)}&url=${encodeURIComponent(url)}`;

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
          <p style={{ margin: 0 }}>Scanning this code works like tapping your pass: your Kin joins their orbit. Your link shows your Kin to anyone and lets them befriend you.</p>
          <a className="share-url mono" href={url}>{url.replace(/^https?:\/\//, "")}</a>
          <a className="btn" href={post} target="_blank" rel="noopener">Post on X</a>
          <div className="btns two">
            {canShare && <button className="btn ghost small" onClick={() => navigator.share({ title, url }).catch(() => {})}>Share</button>}
            <button className="btn ghost small" onClick={copy} style={canShare ? undefined : { gridColumn: "1 / -1" }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      </div>
    </Hull>
  );
}
