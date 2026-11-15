import Link from "next/link";
import { currentPlayer } from "@/lib/session";
import { circleOf, leaderboard } from "@/lib/queries";
import { GLYPH } from "@/lib/zodiac";
import { bestMatches, chartFor, houseFrom, skyAt } from "@/lib/astro";
import { pairFor } from "@/lib/fable";
import { getLang } from "@/lib/lang";
import { animalName, elementName, houseName, phaseName, signName, t, DICTS } from "@/lib/i18n";
import Hull from "@/components/Hull";
import TopBar from "@/components/TopBar";
import FableReading from "@/components/FableReading";
import FableTabs from "@/components/FableTabs";
import LangPicker from "@/components/LangPicker";

// Text presentation (U+FE0E): phones otherwise draw the signs as purple emoji tiles.
const glyph = (sign: string) => `${GLYPH[sign] ?? ""}︎`;

export const dynamic = "force-dynamic";
export const metadata = { title: "Fable · The Future 2050" };

const ELEMENTS = [
  { id: "fire", icon: "🜂" },
  { id: "earth", icon: "🜃" },
  { id: "air", icon: "🜁" },
  { id: "water", icon: "🜄" },
];

// Fable, in the deck: three tabs. You: your reading and your birthday sky. Friends: the signs that suit
// you (and who of them is here), then Fable reading you with each friend and Kin in your orbit, best match
// first. Party: who is what sign and element tonight. In six languages (lib/i18n.ts, components/LangPicker).
export default async function FablePage() {
  const [me, board, lang] = await Promise.all([currentPlayer(), leaderboard(), getLang()]);
  const circle = me ? await circleOf(me.id) : [];
  const d = DICTS[lang];
  const words = { reading: d.reading, lost: d.lost };
  const people = [...board].sort((a, b) => a.name.localeCompare(b.name));
  const n = people.length;
  const bySign = d.signs.map((_, i) => DICTS.en.signs[i]).map((sign) => ({ sign, who: people.filter((p) => p.sign === sign) }));
  const max = Math.max(1, ...bySign.map((s) => s.who.length));
  const ranked = [...bySign].filter((s) => s.who.length).sort((a, b) => b.who.length - a.who.length);
  const top = ranked[0];
  const rare = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const elements = ELEMENTS.map((e) => ({ ...e, count: people.filter((p) => p.element === e.id).length }));
  const lead = [...elements].sort((a, b) => b.count - a.count)[0];
  const S = (sign: string) => signName(lang, sign);

  const chart = me ? chartFor(me.birthday, me.sign) : null;
  const sky = skyAt();
  const house = chart ? houseFrom(chart.sun, sky.moon) : 0;
  const matches = me ? bestMatches(me.sign) : [];
  const friends = me
    ? circle.map((p) => ({ p, pair: pairFor(me, p) })).sort((a, b) => b.pair.score - a.pair.score || a.p.name.localeCompare(b.p.name))
    : [];

  const you = me && chart ? (
    <>
      <Hull title={t(lang, "readsYou", { name: me.name.split(" ")[0] })} code={`${glyph(me.sign)} ${S(me.sign).toUpperCase()}`} className="fable-big">
        <FableReading id={me.id} big lang={lang} words={words} />
      </Hull>
      <Hull title={t(lang, "yourSky")} code={sky.date}>
        <dl className="sky-chips">
          <div><dt>{t(lang, "sun")}</dt><dd>{glyph(chart.sun)} {S(chart.sun)}</dd></div>
          <div>
            <dt>{t(lang, "moon")}</dt>
            <dd>{glyph(chart.moon.sign)} {S(chart.moon.sign)}</dd>
            {chart.moon.other && <small>{t(lang, "moonOr", { sign: S(chart.moon.other) })}</small>}
          </div>
          <div><dt>{t(lang, "year")}</dt><dd>{t(lang, "yearOf", { el: d.cnElements[chart.year.element], animal: animalName(lang, chart.year.index) })}</dd></div>
          <div><dt>{t(lang, "tonight")}</dt><dd>{glyph(sky.moon)} {S(sky.moon)}</dd></div>
        </dl>
        <p className="tonight">
          {t(lang, "tonightLine", { moon: S(sky.moon), phase: phaseName(lang, sky.phase), sign: S(chart.sun), house: houseName(lang, house), theme: d.houses[house] })}
        </p>
      </Hull>
    </>
  ) : (
    <Hull title={t(lang, "yourReading")} led="amber">
      <p style={{ marginTop: 0 }}>{t(lang, "loginFirst")}</p>
      <div className="btns two">
        <Link className="btn" href="/app/login?next=/app/fable">{t(lang, "login")}</Link>
        <Link className="btn ghost" href="/app/scan">{t(lang, "imNew")}</Link>
      </div>
    </Hull>
  );

  const friendsTab = me ? (
    <>
      <Hull title={t(lang, "suitTitle")} code={`${glyph(me.sign)} ${S(me.sign).toUpperCase()}`}>
        <p style={{ marginTop: 0 }} className="muted">{t(lang, "suitSub", { sign: S(me.sign) })}</p>
        <ul className="suits">
          {matches.map((m) => {
            const here = people.filter((p) => p.sign === m.sign && p.id !== me.id);
            return (
              <li key={m.sign} className={m.why}>
                <span className="g" aria-hidden>{glyph(m.sign)}</span>
                <div>
                  <b>{S(m.sign)}</b>
                  <span className="why">{t(lang, `why_${m.why}` as "why_trine")}</span>
                  <span className="here">
                    {here.length ? (
                      <>
                        {t(lang, "hereTonight")}:{" "}
                        {here.slice(0, 8).map((p, i) => (
                          <span key={p.id}>{i > 0 && ", "}<Link href={`/app/c/${p.card_no}`}>{p.name.split(" ")[0]}</Link></span>
                        ))}
                        {here.length > 8 && ` +${here.length - 8}`}
                      </>
                    ) : (
                      t(lang, "nobodyYet")
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Hull>
      <Hull title={t(lang, "friendsTitle")} code={`${friends.length}`}>
        {friends.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{t(lang, "friendsEmpty")}</p>
        ) : (
          <ul className="fable-list">
            {friends.map(({ p, pair }) => (
              <li key={p.id} className="fable-row pair">
                <Link className="face" href={`/app/c/${p.card_no}`} aria-label={p.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : GLYPH[p.sign]}
                </Link>
                <div>
                  <div className="pair-head">
                    <b>{t(lang, "youAnd", { name: p.name.split(" ")[0] })}</b>
                    <span className="score">{pair.score}%</span>
                  </div>
                  <span className="meta">{glyph(me.sign)} {S(me.sign)} + {glyph(p.sign)} {S(p.sign)} · {t(lang, `pair_${pair.key}`)}</span>
                  <FableReading id={p.id} pair lang={lang} words={{ reading: d.pairReading, lost: d.lost }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Hull>
    </>
  ) : (
    <Hull title={t(lang, "friendsTitle")} led="amber">
      <p style={{ marginTop: 0 }}>{t(lang, "friendsLogin")}</p>
      <div className="btns two">
        <Link className="btn" href="/app/login?next=/app/fable%23friends">{t(lang, "login")}</Link>
        <Link className="btn ghost" href="/app/scan">{t(lang, "imNew")}</Link>
      </div>
    </Hull>
  );

  const party = (
    <>
      <Hull title={t(lang, "partyTitle")} code={t(lang, "travelers", { n })}>
        {n === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{t(lang, "noTravelers")}</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              {top && t(lang, "leans", { sign: S(top.sign), k: top.who.length, n })}
              {rare && rare.sign !== top?.sign && <> {t(lang, "rarest", { sign: S(rare.sign) })}</>}
              {lead?.count ? <> {t(lang, "mostly", { el: elementName(lang, lead.id) })}</> : null}
            </p>
            <ol className="sky-bars" aria-label={t(lang, "partyTitle")}>
              {bySign.map((s) => (
                <li key={s.sign} className={top && s.sign === top.sign ? "top" : ""}>
                  <span className="g" aria-hidden>{glyph(s.sign)}</span>
                  <span>{S(s.sign)}</span>
                  <span className="bar-track"><i style={{ ["--w" as any]: `${(s.who.length / max) * 100}%` }} /></span>
                  <span className="n">{s.who.length}</span>
                </li>
              ))}
            </ol>
            <div className="kpis elements" style={{ gridTemplateColumns: "repeat(4, 1fr)" }} aria-label={t(lang, "elementsTitle")}>
              {elements.map((e) => (
                <div key={e.id} className="kpi"><b>{e.count}</b><span>{e.icon} {elementName(lang, e.id)}</span></div>
              ))}
            </div>
          </>
        )}
      </Hull>
      {ranked.length > 0 && (
        <Hull title={t(lang, "whoIsWhat")} code={`${ranked.length}/12`}>
          <div className="who-sign">
            {ranked.map((s) => (
              <div key={s.sign}>
                <h3>{glyph(s.sign)} {S(s.sign)} · {s.who.length}</h3>
                <p>
                  {s.who.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <Link href={`/app/c/${p.card_no}`} className={me?.id === p.id ? "me" : ""}>{p.name}</Link>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </Hull>
      )}
    </>
  );

  return (
    <main className="shell stack" lang={lang}>
      <TopBar me={me} />
      <div className="intro fable-intro">
        <div className="fable-title">
          <h1>{t(lang, "title")} <em>{t(lang, "titleEm")}</em></h1>
          <LangPicker lang={lang} label={t(lang, "language")} />
        </div>
        <p>{t(lang, "intro")}</p>
      </div>
      <FableTabs tabs={[{ id: "you", label: t(lang, "tabYou") }, { id: "friends", label: t(lang, "tabFriends") }, { id: "party", label: t(lang, "tabParty") }]}>
        {you}
        {friendsTab}
        {party}
      </FableTabs>
    </main>
  );
}
