"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Hull from "./Hull";

export type Row = {
  id: string; card_no: number; name: string; character: string; sign: string; finish: string; status: string; error: string | null;
  image_url: string | null; video_url: string | null; attempts: number; model: string | null; guest: string | null; match_score: number | null; tag: string | null;
  clip: { status: string; attempts: number; error: string | null } | null; // the H3 clip of the picture on the card
};

const code = () => {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => a[x % a.length]).join("");
};

export default function AdminPanel({ adminKey, rows, tagsTotal, tagsClaimed }: { adminKey: string; rows: Row[]; tagsTotal: number; tagsClaimed: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [n, setN] = useState(60);
  const [urls, setUrls] = useState<string[]>([]);

  async function redraw(id: string, reroll: boolean) {
    setBusy(id);
    await fetch("/api/admin/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: adminKey, playerId: id, reroll }) });
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      <Hull title="Card URLs for RFID / NFC tags" code={`${tagsClaimed}/${tagsTotal} claimed`}>
        <p style={{ marginTop: 0 }} className="small muted">Write one URL onto each tag (NFC Tools: Write → URL). A tag becomes a pass the first time someone scans it. Codes are random so nobody can collect a card by typing its address.</p>
        <div className="row">
          <input className="input" type="number" min={1} max={500} value={n} onChange={(e) => setN(Number(e.target.value))} style={{ maxWidth: 110 }} aria-label="How many" />
          <button className="btn" onClick={() => setUrls(Array.from({ length: n }, () => `${location.origin}/app/t/${code()}`))}>Generate</button>
        </div>
        {urls.length > 0 && (
          <div className="stack" style={{ marginTop: 12 }}>
            <textarea className="input" readOnly rows={8} value={urls.join("\n")} style={{ fontSize: 13 }} />
            <button className="btn ghost small" onClick={() => navigator.clipboard.writeText(urls.join("\n"))}>Copy all</button>
          </div>
        )}
      </Hull>
      <Hull title="Characters" code={`${rows.length}`}>
        <div style={{ overflowX: "auto" }}>
          <table className="small" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="mono muted" style={{ textAlign: "left" }}>
                <th>№</th><th></th><th>Traveler</th><th>Kin</th><th>Status</th><th>Card</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #1d2a44" }}>
                  <td className="mono">{r.card_no}</td>
                  <td>{r.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.image_url} alt="" width={40} />}</td>
                  <td>{r.name}<div className="muted">{r.guest ? `= ${r.guest} (${(r.match_score ?? 0).toFixed(2)})` : "not on list"}</div></td>
                  <td>{r.character}<div className="muted">{r.sign} · {r.finish}</div></td>
                  <td className="mono">{r.status} ×{r.attempts}<div className="muted">{r.model}</div>{r.error && <div className="error">{r.error.slice(0, 120)}</div>}
                    {r.clip && (
                      <div className="muted">
                        clip {r.video_url ? <a href={r.video_url}>{r.clip.status}</a> : r.clip.status} ×{r.clip.attempts}
                        {r.clip.status === "failed" && r.clip.error && <div className="error">{r.clip.error.slice(0, 120)}</div>}
                      </div>
                    )}
                  </td>
                  <td className="mono">{r.tag ? <a href={`/app/t/${r.tag}`}>{r.tag}</a> : "–"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn ghost small" disabled={busy === r.id} onClick={() => redraw(r.id, false)}>Redraw</button>
                    <button className="btn ghost small" disabled={busy === r.id} onClick={() => redraw(r.id, true)} style={{ marginTop: 4 }}>Reroll finish</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Hull>
    </>
  );
}
