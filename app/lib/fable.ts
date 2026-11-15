import "server-only";
import { createHash } from "node:crypto";
import { generateText } from "ai";
import presets from "./presets.json";
import { db, type Guest, type Player } from "./db";
import { chartFor, houseFrom, HOUSE_THEME, pairOf, skyAt, sunLongitude, type Chart, type Pair } from "./astro";
import { DICTS, LANG_PROMPT, signName, t, type Lang } from "./i18n";

// Fable's readings, written by Fable (Claude Fable 5.2 through the Vercel AI Gateway; if the gateway refuses
// it, the next model writes it and the page still says "Fable"): one for each traveler, and one for each
// pair of travelers who are friends or have each other in orbit. Built from the birthday sky (lib/astro.ts:
// Sun, Moon, the year's animal, tonight's Moon and the house it lights) and what the traveler shared, in the
// reader's language. Kept as text in the characters bucket (fable/<player>/<lang>-<hash>.txt and
// fable/pair/<viewer>/<other>/<lang>-<hash>.txt), so each changes only when its inputs do. No new table.
//
// How to write them comes from what people love in Co-Star, The Pattern and Chani and from the Barnum
// effect: guests compare readings, so every line must be anchored in a named reason from their chart,
// concrete, a gift with its shadow, never hedged, ending on something to do tonight.
const MODELS = [process.env.FABLE_MODEL, "anthropic/claude-fable-5.2", "google/gemini-2.5-flash", "openai/gpt-5-mini"].filter(Boolean) as string[];
const VERSION = "v3"; // in the hash: a new prompt writes new readings

const VOICE = `You are Fable, the oracle of the year 2050 at Varga Future Party, a party set in 2050 where every traveler is met by their Kin, a companion creature from the future. You talk like a friend who happens to be a brilliant astrologer: short, confident, warm, funny, a little roasting, never mean.

How you write (guests will compare readings at the party, so generic lines get caught):
- Anchor every claim in a named reason from the chart you are given: the Sun sign, its element, modality or ruling planet, the Moon sign, the year's animal, how early or late in the sign they were born, tonight's Moon and the house it lights. Use only these placements: never invent others (no Mars, Venus or rising placements).
- Concrete behaviour, not adjectives: a scene you can picture (what they do in the group chat, at the bar, at 1 a.m.), never "you are organised".
- A gift with its shadow beats a compliment: the same trait that makes people love them, and the small price of it.
- Fresh wording every time: never reuse phrases from these instructions, never start with the sign's name.
- Never hedge: no "may", "might", "perhaps", "probably", "at times", "sometimes", nor иногда, a veces, manchmal, 有时, 偶尔, ときどき. Never use the stock clichés of a sign (two-faced Gemini, mysterious Scorpio, stubborn Taurus).
- You know no birth time or place: never mention a rising sign or birth houses. If the Moon sign is marked uncertain, use it lightly or not at all.
- Never mention health, money, death, politics, religion, age or a birth year. No romance assumptions: people may be strangers, coworkers or family.
- Speak informally: ты in Russian, tú in Spanish, du in German, casual Japanese, 你 in Chinese.
- Plain text only: no emojis, markdown, quotation marks, lists or preamble. Do not invent facts about them beyond what is given.`;

export const SINGLE = `${VOICE}

Write a Fable reading for one traveler: exactly three short sentences, at most 60 words in all (in Chinese or Japanese at most 110 characters).
1. Who they are: one sharp, specific line built on a tension in their chart (for example Sun against Moon, or element against animal), as a gift with its shadow.
2. Tonight at the party: use tonight's Moon and the house of theirs it lights, and end the sentence with one small concrete thing to do tonight.
3. One playful prediction for their 2050.
Address them by first name once. Make one line quotable enough to screenshot.`;

export const PAIR = `${VOICE}

Write a Fable pair reading for two travelers at the party: the READER (always "you") and the FRIEND (always by first name, third person). Keep straight whose sign, Moon, animal and words are whose: never swap them. Exactly three short sentences, at most 60 words in all (in Chinese or Japanese at most 110 characters), platonic-friendly.
1. The dynamic: what each brings and what the other one activates in them, in concrete behaviour.
2. Why it works, naming the aspect between their signs or the Moons or the year animals, with any friction reframed as the fun part.
3. A concrete shared mission for the two of them tonight at the party.
Never give a low score as a verdict; a hard aspect is a spark, a plot twist or growth.`;

const PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
  openai: { reasoningEffort: "minimal" },
};

const first = (name: string) => name.split(/\s+/)[0];

function chartOf(p: Player): Chart {
  return chartFor(p.birthday, p.sign);
}

// "early", "middle" or "late" in the sign, by the Sun's degree on the birthday.
function inSign(birthday: string): string {
  const [y, m, d] = birthday.split("-").map(Number);
  const deg = sunLongitude(Date.UTC(y, m - 1, d, 12)) % 30;
  return deg < 8 ? `early (about ${Math.round(deg)}°), close to the cusp with the sign before` : deg > 22 ? `late (about ${Math.round(deg)}°), close to the cusp with the next sign` : `in the middle (about ${Math.round(deg)}°)`;
}

function chartLines(label: string, p: Player, c: Chart): string[] {
  const z = presets.zodiac.find((x) => x.sign === c.sun);
  const moon = c.moon.other ? `${c.moon.sign} (uncertain: ${c.moon.other} if born at the other end of the day)` : c.moon.sign;
  return [
    `${label}: ${p.name}`,
    `Sun: ${c.sun}, ${c.element} sign, ${c.modality}, ruled by ${c.ruler}; born ${inSign(p.birthday)}; classic traits: ${z?.traits ?? ""}`,
    `Moon: ${moon}`,
    `Year animal (Chinese zodiac): ${c.year.element} ${c.year.animal}`,
    `Kin (their companion creature tonight): ${p.character}: ${p.subject}`,
  ];
}

function tonightLines(c: Chart): string[] {
  const sky = skyAt();
  const h = houseFrom(c.sun, sky.moon);
  return [`Tonight's sky (${sky.date}, transiting, not anyone's birth Moon): the Moon is in ${sky.moon}, ${sky.phase}, in the season of ${sky.sunSign}; for a ${c.sun} it lights house ${h} of their solar chart: ${HOUSE_THEME[h]}`];
}

export function facts(p: Player, guest: Guest | null, lang: Lang): string {
  const c = chartOf(p);
  const lines = [...chartLines("Traveler", p, c), ...tonightLines(c)];
  if (guest?.topics?.length) lines.push(`Interests: ${guest.topics.join(", ")}`);
  if (p.bio) lines.push(`About them, in their words: ${p.bio}`);
  if (p.ask_me) lines.push(`Ask them about: ${p.ask_me}`);
  if (p.prophecy) lines.push(`The oracles already told them (do not repeat it): ${p.prophecy}`);
  lines.push(`Write in ${LANG_PROMPT[lang]}.`);
  return lines.join("\n");
}

export function pairFacts(me: Player, other: Player, pair: Pair, lang: Lang): string {
  const a = chartOf(me), b = chartOf(other);
  const lines = [
    ...chartLines("READER (write to them as you)", me, a),
    ...chartLines(`FRIEND (call them ${first(other.name)})`, other, b),
    `Between you: Suns in ${pair.sun}, Moons in ${pair.moon}, the best Sun-to-Moon link a ${pair.cross}, year animals: ${pair.cn}. Compatibility ${pair.score}/100, headline: ${DICTS.en[`pair_${pair.key}`]}.`,
    ...tonightLines(a),
  ];
  if (other.bio) lines.push(`FRIEND ${first(other.name)} about themselves: ${other.bio}`);
  if (other.ask_me) lines.push(`Ask FRIEND ${first(other.name)} about: ${other.ask_me}`);
  if (me.bio) lines.push(`READER about themselves: ${me.bio}`);
  lines.push(`Write in ${LANG_PROMPT[lang]}.`);
  return lines.join("\n");
}

export function fallbackFable(p: Player, lang: Lang = "en"): string {
  return t(lang, "fallback", { name: first(p.name), sign: signName(lang, p.sign) });
}

const memo = new Map<string, string>();
const refused = new Map<string, number>(); // model -> skip until (ms), after the gateway says no
const pending = new Map<string, Promise<string | null>>(); // one model call per text, however many tabs ask

const hash = (s: string) => createHash("sha1").update(VERSION + s).digest("hex").slice(0, 12);

async function written(path: string, system: string, prompt: string): Promise<string | null> {
  const hit = memo.get(path);
  if (hit) return hit;
  const inflight = pending.get(path);
  if (inflight) return inflight;
  const job = (async () => {
    const bucket = db().storage.from("characters");
    const { data: stored } = await bucket.download(path);
    if (stored) {
      const text = (await stored.text()).trim();
      if (text) return memo.set(path, text), text;
    }
    for (const model of MODELS) {
      if ((refused.get(model) ?? 0) > Date.now()) continue;
      try {
        const { text: raw } = await generateText({
          model,
          system,
          prompt,
          maxOutputTokens: 600,
          temperature: 0.9,
          providerOptions: PROVIDER_OPTIONS,
          abortSignal: AbortSignal.timeout(25_000),
        });
        const text = raw.replace(/[*#"“”«»„]/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
        if (text.length < 20) continue;
        memo.set(path, text);
        await bucket.upload(path, Buffer.from(text), { contentType: "text/plain; charset=utf-8", upsert: true }).catch(() => {});
        return text;
      } catch (e) {
        const msg = String(e);
        console.warn(`fable: ${model} failed`, msg.slice(0, 200));
        if (/40[13]|forbidden|credit|not allowed|free tier/i.test(msg)) refused.set(model, Date.now() + 10 * 60_000);
      }
    }
    return null;
  })().finally(() => pending.delete(path));
  pending.set(path, job);
  return job;
}

export async function fableFor(p: Player, guest: Guest | null, lang: Lang = "en"): Promise<{ text: string; kept: boolean }> {
  const input = facts(p, guest, lang);
  const text = await written(`fable/${p.id}/${lang}-${hash(input)}.txt`, SINGLE, input);
  return text ? { text, kept: true } : { text: fallbackFable(p, lang), kept: false };
}

// The pair reading, as the viewer reads it ("you and Leo"): the score is arithmetic (lib/astro.ts), the words Fable's.
export function pairFor(me: Player, other: Player): Pair {
  return pairOf(chartOf(me), chartOf(other));
}

export async function pairFable(me: Player, other: Player, lang: Lang = "en"): Promise<{ pair: Pair; text: string; kept: boolean }> {
  const pair = pairFor(me, other);
  const input = pairFacts(me, other, pair, lang);
  const text = await written(`fable/pair/${me.id}/${other.id}/${lang}-${hash(input)}.txt`, PAIR, input);
  const fallback = t(lang, "pairFallback", { label: t(lang, `pair_${pair.key}`), name: first(other.name) });
  return text ? { pair, text, kept: true } : { pair, text: fallback, kept: false };
}
