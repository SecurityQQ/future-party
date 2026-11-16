import "server-only";
import { streamText } from "ai";
import presets from "./presets.json";
import type { Guest, Player } from "./db";
import { styleLabel } from "./character";
import { parseReading } from "./astrologers";
import { aiPaused } from "./paused";

// Through the Vercel AI Gateway (OIDC on Vercel, `vercel env pull` locally). Tried in order; the
// gateway's free tier allows the two defaults. Set READING_MODEL (e.g. anthropic/claude-haiku-5.5)
// after topping up gateway credits. While paused (lib/paused.ts) the template is used instead.
const MODELS = (aiPaused() ? [] : [process.env.READING_MODEL, "google/gemini-2.5-flash", "openai/gpt-5-mini"]).filter(Boolean) as string[];

const SYSTEM = `You write the lines of three alien oracles at Arrival Station, the first stop of The Future Party, a party set in the year 2050. In this 2050 nobody arrives alone: every traveler is met by their Kin, a companion from the future shaped by the sky they were born under and the life they lead. A guest just scanned their pass; while their Kin materializes, the oracles read their stars on a retro starship comms screen.

The oracles:
- VEXA (Vexa Orrin, Star Cartographer): elegant, theatrical, four golden eyes. Reads the birth sky: sun sign, element and what it says about the guest's character, with one affectionate tease.
- GRUMM (Grumm Tal, Keeper of the Archive): grumpy but kind old archivist. Says whether he found the guest in the party archive, then reveals their Kin by its name and describes it vividly, tying it to their interests when given.
- ILU (Ilu, Oracle of Probabilities): serene being of light. Gives a short prophecy for the guest's 2050 and names one playful superpower their Kin grants them at the party tonight.

Write exactly four lines, in this order and format, nothing before or after:
VEXA: <2 or 3 sentences>
GRUMM: <2 or 3 sentences>
ILU: <2 sentences>
PROPHECY: <one quotable line of at most 12 words for the collectible card>

Rules: English only. Address the guest by first name. Each oracle line under 55 words. Warm, witty, cosmic, a little absurd; never mean. No markdown, no emojis, no lists, no quotation marks around lines. Never mention health, money, relationships, politics, religion or age. Do not invent facts about the guest beyond what is given.`;

export function readingPrompt(p: Player, guest: Guest | null): string {
  const z = presets.zodiac.find((x) => x.sign === p.sign);
  const date = new Date(p.birthday + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const lines = [
    `Guest: ${p.name}`,
    `Born: ${date}`,
    `Sun sign: ${p.sign} (${p.element}); classic traits: ${z?.traits ?? ""}`,
    `Found in the party archive: ${guest ? `yes, as ${guest.name}` : "no, a new arrival not on the guest list"}`,
    `Kin (their companion creature): ${p.character}: ${p.subject}`,
    `Card finish: ${styleLabel(p.style)}`,
  ];
  if (guest?.topics?.length) lines.push(`Interests: ${guest.topics.join(", ")}`);
  return lines.join("\n");
}

// Used when the gateway is not reachable: still personal, never empty.
export function fallbackReading(p: Player, guest: Guest | null): string {
  const first = p.name.split(/\s+/)[0];
  const z = presets.zodiac.find((x) => x.sign === p.sign);
  const traits = (z?.traits ?? "curious").split(",").map((t) => t.trim());
  const interest = guest?.topics?.[0];
  const elementLine: Record<string, string> = {
    fire: "a fire sign burns behind your eyes, and the sensors are already warm",
    earth: "an earth sign steadies the deck when the gravity flickers",
    air: "an air sign hums through you, and the comms channel is suddenly chattier",
    water: "a water sign flows under you, and every star map turns into a tide chart",
  };
  return [
    `VEXA: ${first}, the sky on your birthday shows ${p.sign}: ${elementLine[p.element] ?? "a bright sign rises"}. ${traits[0][0].toUpperCase() + traits[0].slice(1)} and ${traits[1] ?? "luminous"}, the charts say; also a little hard to keep in orbit, which I adore.`,
    `GRUMM: ${guest ? `Hmph. Found you in the archive, record of ${guest.name}.` : "Hmph. Not in my archive. A new arrival, then: I'll write you in myself."} Your companion is the ${p.character}, ${p.subject}.${interest ? ` It already knows about ${interest}. Of course it does.` : ""}`,
    `ILU: In 2050 the probabilities fold in your favor, ${first}, and doors open one heartbeat before you reach them. Tonight your ${p.character} lets you find the best conversation in any room within three steps.`,
    `PROPHECY: The future kept a seat for you. You are right on time.`,
  ].join("\n");
}

export function prophecyOf(text: string): string | null {
  const m = text.match(/PROPHECY\s*:\s*(.+)/);
  return m ? m[1].trim().replace(/^["“]|["”]$/g, "").slice(0, 160) : null;
}

// Whatever the model left out (a cut-off line, a missing speaker), filled from the template.
// Returns only the text to append, so the streamed part stays as it was.
function completion(full: string, fb: string): string {
  const have = parseReading(full);
  const want = parseReading(fb);
  if (!have.some((s) => s.who === "VEXA")) return (full.trim() ? "\n" : "") + fb; // unusable: restart with the template
  let tail = "";
  const last = have[have.length - 1];
  if (last && last.text.length < 12 && last.who !== "PROPHECY")
    tail += " " + (want.find((s) => s.who === last.who)?.text ?? "");
  for (const w of want) if (!have.some((s) => s.who === w.who)) tail += `\n${w.who}: ${w.text}`;
  return tail;
}

// Gemini 2.5 thinks by default and GPT-5 reasons: both would spend the token budget before writing.
const PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
  openai: { reasoningEffort: "minimal" },
};

// Stream the reading: models in order, then the template for anything missing.
export function streamReading(p: Player, guest: Guest | null, onDone: (text: string) => Promise<void>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let full = "";
      for (const model of MODELS) {
        try {
          const result = streamText({
            model,
            system: SYSTEM,
            prompt: readingPrompt(p, guest),
            maxOutputTokens: 1500,
            temperature: 0.9,
            providerOptions: PROVIDER_OPTIONS,
            abortSignal: AbortSignal.timeout(25_000),
            onError: () => {}, // a failed model yields no text; the next one is tried
          });
          for await (const chunk of result.textStream) {
            const clean = chunk.replace(/[*#]/g, "");
            full += clean;
            controller.enqueue(enc.encode(clean));
          }
        } catch (e) {
          console.warn(`reading: ${model} failed`, String(e).slice(0, 200));
        }
        if (full.trim()) break;
      }
      const tail = completion(full, fallbackReading(p, guest));
      if (tail) {
        controller.enqueue(enc.encode(tail));
        full = tail.startsWith("\nVEXA") || !parseReading(full).some((s) => s.who === "VEXA") ? fallbackReading(p, guest) : full + tail;
      }
      await onDone(full.trim()).catch((e) => console.warn("reading: save failed", e));
      controller.close();
    },
  });
}
