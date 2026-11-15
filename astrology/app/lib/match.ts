// Find the guest-list entry closest to a typed name. Handles Cyrillic, nicknames
// (Dima, Sasha, Katya), spelling variants (Aleksey/Alexei) and typos (Jaro-Winkler per word).
import type { Guest } from "./db";

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", і: "i", ї: "yi", є: "ye", ґ: "g",
};

// Spelling variants and nicknames -> one canonical word. Ira and Irina stay apart: they are two guests.
const CANON: Record<string, string> = {};
const groups: [string, string[]][] = [
  ["aleksey", ["alexey", "alexei", "aleksei", "aleksej", "alexej", "lesha", "lyosha", "alyosha", "lesh"]],
  ["alexander", ["aleksandr", "alexandr", "aleksander", "sasha", "sanya"]],
  ["dmitry", ["dmitriy", "dmitrii", "dmitri", "dmitrij", "dima", "mitya"]],
  ["sergey", ["sergei", "serhii", "serhiy", "seryozha", "serezha"]],
  ["yurii", ["yuri", "yury", "yuriy", "yura"]],
  ["natallia", ["natalia", "natalya", "natalja", "natasha", "natalie"]],
  ["nadiia", ["nadia", "nadya", "nadiya", "nadezhda"]],
  ["sonya", ["sonia", "sofia", "sofiya", "sophia", "sofya", "sonechka"]],
  ["kamilla", ["kamila", "camilla", "camila"]],
  ["kate", ["katya", "katia", "ekaterina", "yekaterina", "katerina", "katie", "kat"]],
  ["peter", ["pyotr", "petr", "petya", "pete"]],
  ["vladimir", ["vova", "volodya", "vovka"]],
  ["vlad", ["vladislav", "vladik"]],
  ["michael", ["mikhail", "misha", "mike", "mikhael"]],
  ["ivan", ["vanya"]],
  ["anna", ["anya", "ann", "anne", "annie"]],
  ["lev", ["leva", "lyova", "leo"]],
  ["kirill", ["kiril", "cyril"]],
  ["taisa", ["taisiya", "taisia", "taya"]],
  ["barys", ["boris", "borys"]],
  ["catherine", ["cathy", "kathy", "katherine", "kathryn"]],
  ["paulina", ["polina", "pauline"]],
];
for (const [canon, alts] of groups) for (const a of alts) CANON[a] = canon;

export function normalize(s: string): string {
  const lower = s.toLowerCase().replace(/[а-яёіїєґ]/g, (c) => CYR[c] ?? c);
  return lower
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/kh/g, "h")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function words(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w && w !== "plus" && w !== "1")
    .map((w) => CANON[w] ?? w);
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
  let m = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++)
      if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = true; m++; break; }
  if (!m) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++)
    if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; }
  const jaro = (m / a.length + m / b.length + (m - t / 2) / m) / 3;
  let p = 0;
  while (p < 4 && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

function wordSim(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 3 && b.startsWith(a)) return 0.9; // "alex" -> "alexander"
  return jaroWinkler(a, b);
}

// 0..1: how well the typed words match one spelling of a guest's name.
export function nameScore(input: string[], name: string[]): number {
  if (!input.length || !name.length) return 0;
  const used = new Set<number>();
  let sum = 0;
  for (const w of input) {
    let best = 0, at = -1;
    name.forEach((n, j) => {
      const s = wordSim(w, n);
      if (s > best) { best = s; at = j; }
    });
    sum += best;
    if (best >= 0.85) used.add(at);
  }
  const wordsScore = sum / input.length;
  const coverage = used.size / new Set(name).size; // typed "Gleb" covers half of "Gleb Babiy"
  return 0.75 * wordsScore + 0.25 * coverage;
}

export type Candidate = { guest: Guest; score: number; taken: boolean };

export function rankGuests(typed: string, guests: Guest[], taken: Set<number>): Candidate[] {
  const input = words(typed);
  return guests
    .map((g) => {
      const spellings = [g.name, ...(g.aliases ?? [])].map(words);
      const raw = Math.max(...spellings.map((s) => nameScore(input, s)));
      const isTaken = taken.has(g.id);
      return { guest: g, score: isTaken ? raw - 0.1 : raw, taken: isTaken };
    })
    .sort((a, b) => b.score - a.score);
}

// "auto": one clear match; "choose": a few plausible ones for the person to pick; "none": a new face.
export function decide(ranked: Candidate[]): { kind: "auto"; pick: Candidate } | { kind: "choose"; options: Candidate[] } | { kind: "none" } {
  const [best, second] = ranked;
  if (!best || best.score < 0.62) return { kind: "none" };
  // Only a near-full match far ahead of the next one is taken without asking ("Dima Golomidov");
  // a lone first name ("Timur") gets a one-tap confirmation.
  if (best.score >= 0.95 && (!second || best.score - second.score >= 0.15)) return { kind: "auto", pick: best };
  return { kind: "choose", options: ranked.filter((c) => c.score >= 0.62).slice(0, 5) };
}
