import "server-only";
import { createHash } from "node:crypto";
import { generateText } from "ai";
import presets from "./presets.json";
import { db, type Guest, type Player } from "./db";

// Fable's reading: a short prediction for one traveler, written by Fable (Claude Fable 5.2 through the
// Vercel AI Gateway) from what the party knows about them: name, sky, Kin and what they shared. Written
// once and kept in the characters bucket (fable/<player>/<hash of the inputs>.txt), so it changes only
// when the traveler does. No new table. If the gateway refuses Fable (its free tier allows only the two
// defaults below), the next model writes it; the page still says "Fable", it's the party's oracle voice.
const MODELS = [process.env.FABLE_MODEL, "anthropic/claude-fable-5.2", "google/gemini-2.5-flash", "openai/gpt-5-mini"].filter(Boolean) as string[];

const SYSTEM = `You are Fable, the oracle of the year 2050 at Varga Future Party, a party set in 2050 where every traveler is met by their Kin, a companion creature from the future. You give each traveler a Fable reading: a tiny prediction.

Write exactly two short sentences, at most 40 words in all: first what tonight holds for them at the party, then one thing their 2050 holds. Build it from their sun sign and element, their Kin, and whatever they shared about themselves. Address them by first name once. English only. Warm, witty, specific, a little absurd; never mean. Never mention health, money, love life, politics, religion or age. No emojis, no markdown, no quotation marks, no preamble. Do not invent facts about them beyond what is given.`;

const PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
  openai: { reasoningEffort: "minimal" },
};

function facts(p: Player, guest: Guest | null): string {
  const z = presets.zodiac.find((x) => x.sign === p.sign);
  const lines = [
    `Name: ${p.name}`,
    `Sun sign: ${p.sign} (${p.element}); classic traits: ${z?.traits ?? ""}`,
    `Kin: ${p.character}: ${p.subject}`,
  ];
  if (guest?.topics?.length) lines.push(`Interests: ${guest.topics.join(", ")}`);
  if (p.bio) lines.push(`About them, in their words: ${p.bio}`);
  if (p.ask_me) lines.push(`Ask them about: ${p.ask_me}`);
  if (p.prophecy) lines.push(`The oracles already told them (do not repeat it): ${p.prophecy}`);
  return lines.join("\n");
}

// When no model answers: still about them, never empty (and not stored, so the next visit asks again).
const ELEMENT: Record<string, string> = {
  fire: "you light the room before you reach it",
  earth: "the floor feels steadier wherever you stand",
  air: "every conversation you join grows a new idea",
  water: "the music turns into a tide that pulls people toward you",
};
export function fallbackFable(p: Player): string {
  const first = p.name.split(/\s+/)[0];
  return `Tonight, ${first}, ${ELEMENT[p.element] ?? "the stars lean your way"}, and your ${p.character} finds you the one person you came to meet. In 2050 ${p.sign} keeps your seat by the window, with the best view of what you built.`;
}

const memo = new Map<string, string>();
const refused = new Map<string, number>(); // model -> skip until (ms), after the gateway says no

export async function fableFor(p: Player, guest: Guest | null): Promise<{ text: string; kept: boolean }> {
  const input = facts(p, guest);
  const path = `fable/${p.id}/${createHash("sha1").update(input).digest("hex").slice(0, 12)}.txt`;
  const hit = memo.get(path);
  if (hit) return { text: hit, kept: true };
  const bucket = db().storage.from("characters");
  const { data: stored } = await bucket.download(path);
  if (stored) {
    const text = (await stored.text()).trim();
    if (text) {
      memo.set(path, text);
      return { text, kept: true };
    }
  }

  for (const model of MODELS) {
    if ((refused.get(model) ?? 0) > Date.now()) continue;
    try {
      const { text: raw } = await generateText({
        model,
        system: SYSTEM,
        prompt: input,
        maxOutputTokens: 400,
        temperature: 0.9,
        providerOptions: PROVIDER_OPTIONS,
        abortSignal: AbortSignal.timeout(20_000),
      });
      const text = raw.replace(/[*#"“”]/g, "").replace(/\s+/g, " ").trim().slice(0, 400);
      if (text.length < 20) continue;
      memo.set(path, text);
      await bucket.upload(path, Buffer.from(text), { contentType: "text/plain; charset=utf-8", upsert: true }).catch(() => {});
      return { text, kept: true };
    } catch (e) {
      const msg = String(e);
      console.warn(`fable: ${model} failed`, msg.slice(0, 200));
      if (/40[13]|forbidden|credit|not allowed|free tier/i.test(msg)) refused.set(model, Date.now() + 10 * 60_000);
    }
  }
  return { text: fallbackFable(p), kept: false };
}
