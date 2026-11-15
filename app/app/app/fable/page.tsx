import Link from "next/link";
import presets from "@/lib/presets.json";
import { currentPlayer } from "@/lib/session";
import { leaderboard } from "@/lib/queries";
import { GLYPH } from "@/lib/zodiac";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import FableReading from "@/components/FableReading";

// Text presentation (U+FE0E): phones otherwise draw the signs as purple emoji tiles.
const glyph = (sign: string) => `${GLYPH[sign] ?? ""}\uFE0E`;

export const dynamic = "force-dynamic";
export const metadata = { title: "Fable · The Future 2050" };

const ELEMENTS = [
  { id: "fire", label: "Fire", icon: "🜂" },
  { id: "earth", label: "Earth", icon: "🜃" },
  { id: "air", label: "Air", icon: "🜁" },
  { id: "water", label: "Water", icon: "🜄" },
];

// Fable, in the deck where the Mirror was: the party's sky in numbers (who is what sign and element),
// and a short Fable reading for every traveler, yours first.
export default async function FablePage() {
  const [me, board] = await Promise.all([currentPlayer(), leaderboard()]);
  const people = [...board].sort((a, b) => a.name.localeCompare(b.name));
  const n = people.length;
  const bySign = presets.zodiac.map((z) => ({ sign: z.sign, element: z.element, who: people.filter((p) => p.sign === z.sign) }));
  const max = Math.max(1, ...bySign.map((s) => s.who.length));
  const ranked = [...bySign].filter((s) => s.who.length).sort((a, b) => b.who.length - a.who.length);
  const top = ranked[0];
  const rare = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const elements = ELEMENTS.map((e) => ({ ...e, count: people.filter((p) => p.element === e.id).length }));
  const lead = [...elements].sort((a, b) => b.count - a.count)[0];
  const others = me ? people.filter((p) => p.id !== me.id) : people;

  return (
    <main className="shell stack">
      <TopBar me={me} />
      <div className="intro">
        <h1>Fable reads <em>the party</em></h1>
        <p>Fable, the oracle of 2050, reads every traveler from their name, their sky and their Kin. Below: who is what sign tonight, and a short reading for each of us.</p>
      </div>

      {me ? (
        <Hull title={`Fable reads ${me.name.split(" ")[0]}`} code={`${glyph(me.sign)} ${me.sign.toUpperCase()}`} className="fable-big">
          <FableReading id={me.id} big />
        </Hull>
      ) : (
        <Hull title="Your reading" led="amber">
          <p style={{ marginTop: 0 }}>Fable reads you once you have a Kin. Log in with your email, or tap your pass to arrive.</p>
          <div className="btns two">
            <Link className="btn" href="/app/login?next=/app/fable">Log in with email</Link>
            <Link className="btn ghost" href="/app/scan">I’m new</Link>
          </div>
        </Hull>
      )}

      <Hull title="The party’s sky" code={`${n} TRAVELERS`}>
        {n === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No travelers yet. The sky fills as people arrive.</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              {top && <>The party leans <b>{top.sign}</b> ({top.who.length} of {n}).</>}
              {rare && rare.sign !== top?.sign && <> The rarest sign here is <b>{rare.sign}</b>.</>}
              {lead?.count ? <> Most of us are <b>{lead.label.toLowerCase()}</b> signs.</> : null}
            </p>
            <ol className="sky-bars" aria-label="Travelers by sun sign">
              {bySign.map((s) => (
                <li key={s.sign} className={top && s.sign === top.sign ? "top" : ""}>
                  <span className="g" aria-hidden>{glyph(s.sign)}</span>
                  <span>{s.sign}</span>
                  <span className="bar-track"><i style={{ ["--w" as any]: `${(s.who.length / max) * 100}%` }} /></span>
                  <span className="n">{s.who.length}</span>
                </li>
              ))}
            </ol>
            <div className="kpis elements" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {elements.map((e) => (
                <div key={e.id} className="kpi"><b>{e.count}</b><span>{e.icon} {e.label}</span></div>
              ))}
            </div>
          </>
        )}
      </Hull>

      {ranked.length > 0 && (
        <Hull title="Who is what" code="12 SIGNS">
          <div className="who-sign">
            {ranked.map((s) => (
              <div key={s.sign}>
                <h3>{glyph(s.sign)} {s.sign} · {s.who.length}</h3>
                <p>
                  {s.who.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && (i === s.who.length - 1 ? " and " : ", ")}
                      <Link href={`/app/c/${p.card_no}`}>{p.name}</Link>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </Hull>
      )}

      {others.length > 0 && (
        <Hull title="Fable reads everyone" code={`${others.length}`}>
          <ul className="fable-list">
            {others.map((p) => (
              <li key={p.id} className="fable-row">
                <Link className="face" href={`/app/c/${p.card_no}`} aria-label={p.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : GLYPH[p.sign]}
                </Link>
                <div>
                  <b>{p.name}</b>
                  <span className="meta">{glyph(p.sign)} {p.sign} · {p.character}</span>
                  <FableReading id={p.id} />
                </div>
              </li>
            ))}
          </ul>
        </Hull>
      )}
    </main>
  );
}

