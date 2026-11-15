// The party's astrology, worked out from a birthday alone (we never ask for a birth time or place):
// the Sun sign, the Moon sign (where the Moon stood that day; flagged when the hour could move it to the
// next sign), the Chinese year animal, tonight's Moon and the house of the traveler's chart it lights,
// and a compatibility score for two travelers. Pure functions, safe in the browser and on the server.

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export type SignName = (typeof SIGNS)[number];
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

export const ELEMENT_OF: Element[] = ["fire", "earth", "air", "water"];
export const elementOf = (sign: string): Element => ELEMENT_OF[Math.max(0, SIGNS.indexOf(sign as SignName)) % 4];
export const modalityOf = (sign: string): Modality => (["cardinal", "fixed", "mutable"] as const)[Math.max(0, SIGNS.indexOf(sign as SignName)) % 3];
export const RULER: Record<SignName, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "the Moon", Leo: "the Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Pluto and Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus and Saturn", Pisces: "Neptune and Jupiter",
};

// The party night: Friday 20 November 2026, evening in California (04:00 UTC on the 21st). Readings before
// and on the night speak about that sky; after it, about today's.
export const PARTY_NIGHT = Date.UTC(2026, 10, 21, 4, 0);
export const skyTime = (now = Date.now()) => (now < PARTY_NIGHT + 12 * 3600_000 ? PARTY_NIGHT : now);

const rad = (d: number) => (d * Math.PI) / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

// The Moon's ecliptic longitude (degrees, tropical) at a moment: the main terms of Meeus' lunar theory,
// good to about 0.3°, far finer than the 12° the Moon travels in a day.
export function moonLongitude(ms: number): number {
  const d = ms / 86400_000 + 2440587.5 - 2451545.0;
  const L = 218.3164477 + 13.17639648 * d;
  const D = rad(297.8501921 + 12.19074912 * d);
  const M = rad(357.5291092 + 0.98560028 * d);
  const Mp = rad(134.9633964 + 13.06499295 * d);
  const F = rad(93.272095 + 13.22935024 * d);
  return norm(
    L +
      6.289 * Math.sin(Mp) + 1.274 * Math.sin(2 * D - Mp) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * Mp) -
      0.186 * Math.sin(M) - 0.114 * Math.sin(2 * F) + 0.059 * Math.sin(2 * D - 2 * Mp) + 0.057 * Math.sin(2 * D - M - Mp) +
      0.053 * Math.sin(2 * D + Mp) + 0.046 * Math.sin(2 * D - M) + 0.041 * Math.sin(Mp - M) - 0.035 * Math.sin(D) - 0.03 * Math.sin(Mp + M),
  );
}

// The Sun's longitude (degrees): enough to tell the season and the Moon's phase.
export function sunLongitude(ms: number): number {
  const d = ms / 86400_000 + 2440587.5 - 2451545.0;
  const g = rad(357.529 + 0.98560028 * d);
  return norm(280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
}

const signAt = (lon: number): SignName => SIGNS[Math.floor(norm(lon) / 30)];

// "1994-04-27" -> the Sun sign, by the calendar table the app has always used (presets.json).
const FROM: [string, SignName][] = [
  ["01-20", "Aquarius"], ["02-19", "Pisces"], ["03-21", "Aries"], ["04-20", "Taurus"], ["05-21", "Gemini"], ["06-21", "Cancer"],
  ["07-23", "Leo"], ["08-23", "Virgo"], ["09-23", "Libra"], ["10-23", "Scorpio"], ["11-22", "Sagittarius"], ["12-22", "Capricorn"],
];
export function sunSign(birthday: string): SignName {
  const md = birthday.slice(5, 10);
  let s: SignName = "Capricorn";
  for (const [from, sign] of FROM) if (md >= from) s = sign;
  return s;
}

export type Moon = { sign: SignName; other: SignName | null }; // other: the sign it may be in, depending on the hour
export function moonSign(birthday: string): Moon {
  const [y, m, d] = birthday.split("-").map(Number);
  const noon = Date.UTC(y, m - 1, d, 12);
  const at = (h: number) => signAt(moonLongitude(noon + h * 3600_000));
  const mid = at(0);
  // The birth hour is unknown: a day either side of local noon anywhere on Earth is about ±14 h of UTC.
  const early = at(-14), late = at(14);
  const other = early !== mid ? early : late !== mid ? late : null;
  return { sign: mid, other };
}

// Chinese zodiac by solar year (the year turns at Lichun, about 4 February, as in BaZi).
export const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"] as const;
const CN_ELEMENTS = ["Metal", "Metal", "Water", "Water", "Wood", "Wood", "Fire", "Fire", "Earth", "Earth"];
export type ChineseYear = { animal: (typeof ANIMALS)[number]; element: string; index: number };
export function chineseYear(birthday: string): ChineseYear {
  let y = Number(birthday.slice(0, 4));
  if (birthday.slice(5, 10) < "02-04") y -= 1;
  const index = (((y - 1900) % 12) + 12) % 12;
  return { animal: ANIMALS[index], element: CN_ELEMENTS[((y % 10) + 10) % 10], index };
}

const PHASES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];

// Whole-sign houses counted from the Sun sign (the solar chart every sun-sign column uses).
export const HOUSE_THEME = [
  "", "self, look and first impressions", "what you value, taste and pleasures", "talk, messages, quick trips and siblings",
  "home, roots and family", "play, flirting, creativity and fun", "habits, work and small rituals",
  "partners and one-to-one meetings", "depth, secrets and intimacy", "big ideas, travel and the far future",
  "ambition, reputation and being seen", "friends, groups, parties and hopes", "dreams, solitude and what happens backstage",
];
export const houseFrom = (sun: string, other: string) => ((SIGNS.indexOf(other as SignName) - SIGNS.indexOf(sun as SignName) + 12) % 12) + 1;

export type Sky = { moon: SignName; phase: string; sunSign: SignName; date: string };
export function skyAt(ms = skyTime()): Sky {
  const moon = moonLongitude(ms), sun = sunLongitude(ms);
  return {
    moon: signAt(moon),
    phase: PHASES[Math.floor(norm(moon - sun + 22.5) / 45) % 8],
    sunSign: signAt(sun),
    date: new Date(ms).toISOString().slice(0, 10),
  };
}

export type Chart = { sun: SignName; moon: Moon; year: ChineseYear; element: Element; modality: Modality; ruler: string };
export function chartFor(birthday: string, sun?: string): Chart {
  const s = (SIGNS.includes(sun as SignName) ? sun : sunSign(birthday)) as SignName;
  return { sun: s, moon: moonSign(birthday), year: chineseYear(birthday), element: elementOf(s), modality: modalityOf(s), ruler: RULER[s] };
}

// ---- Compatibility ------------------------------------------------------------------------------------
// By the angle between two signs (0 = same sign … 6 = opposite), the classic aspects: trines (same element)
// flow, sextiles (fire+air, earth+water) spark, oppositions pull, squares rub, the 30° and 150° neighbours
// have to learn each other. Every score is kept party-friendly: the lowest still reads as a good story.
export type Aspect = "conjunction" | "semisextile" | "sextile" | "square" | "trine" | "quincunx" | "opposition";
const ASPECTS: Aspect[] = ["conjunction", "semisextile", "sextile", "square", "trine", "quincunx", "opposition"];
const ASPECT_SCORE: Record<Aspect, number> = { conjunction: 75, semisextile: 58, sextile: 85, square: 62, trine: 95, quincunx: 52, opposition: 80 };
export const distance = (a: string, b: string) => {
  const k = Math.abs(SIGNS.indexOf(a as SignName) - SIGNS.indexOf(b as SignName)) % 12;
  return Math.min(k, 12 - k);
};
export const aspectOf = (a: string, b: string): Aspect => ASPECTS[distance(a, b)];

export type CnBond = "trine" | "harmony" | "same" | "clash" | "neutral";
const TRINES = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
const HARMONY = new Set(["0-1", "2-11", "3-10", "4-9", "5-8", "6-7"]);
export function chineseBond(a: number, b: number): CnBond {
  if (a === b) return "same";
  if (Math.abs(a - b) === 6) return "clash";
  if (TRINES.some((t) => t.includes(a) && t.includes(b))) return "trine";
  if (HARMONY.has(`${Math.min(a, b)}-${Math.max(a, b)}`)) return "harmony";
  return "neutral";
}
const CN_SCORE: Record<CnBond, number> = { trine: 95, harmony: 92, same: 78, neutral: 68, clash: 52 };

export type Pair = {
  score: number; // 0–100, shown as a percentage
  sun: Aspect; // Sun to Sun
  moon: Aspect; // Moon to Moon
  cross: Aspect; // the better of Sun-to-Moon either way
  cn: CnBond;
  key: "flow" | "spark" | "magnet" | "mirror" | "forge" | "puzzle"; // the headline, translated in lib/i18n.ts
};
export function pairOf(a: Chart, b: Chart): Pair {
  const sun = aspectOf(a.sun, b.sun);
  const moon = aspectOf(a.moon.sign, b.moon.sign);
  const x1 = aspectOf(a.sun, b.moon.sign), x2 = aspectOf(a.moon.sign, b.sun);
  const cross = ASPECT_SCORE[x1] >= ASPECT_SCORE[x2] ? x1 : x2;
  const cn = chineseBond(a.year.index, b.year.index);
  // A Sun on the other's Moon is the old marriage-chart sign of feeling at home with someone.
  const lights = a.sun === b.moon.sign || b.sun === a.moon.sign ? 6 : 0;
  const raw = 0.5 * ASPECT_SCORE[sun] + 0.2 * ASPECT_SCORE[moon] + 0.18 * ASPECT_SCORE[cross] + 0.12 * CN_SCORE[cn] + lights;
  const score = Math.max(48, Math.min(99, Math.round(raw)));
  const key = sun === "trine" ? "flow" : sun === "sextile" ? "spark" : sun === "opposition" ? "magnet" : sun === "conjunction" ? "mirror" : sun === "square" ? "forge" : "puzzle";
  return { score, sun, moon, cross, cn, key };
}

// The three signs that suit a sign best: its two trines (same element) and the sextile the classic pairing
// tables name (fire with air, earth with water), then its opposite as the "magnetic" fourth.
const SEXTILE: Record<SignName, SignName> = {
  Aries: "Gemini", Taurus: "Cancer", Gemini: "Aries", Cancer: "Taurus", Leo: "Libra", Virgo: "Cancer",
  Libra: "Leo", Scorpio: "Virgo", Sagittarius: "Aquarius", Capricorn: "Scorpio", Aquarius: "Sagittarius", Pisces: "Capricorn",
};
export function bestMatches(sign: string): { sign: SignName; why: Aspect }[] {
  const i = Math.max(0, SIGNS.indexOf(sign as SignName));
  const at = (k: number) => SIGNS[(i + k + 12) % 12];
  return [
    { sign: at(4), why: "trine" },
    { sign: at(-4), why: "trine" },
    { sign: SEXTILE[SIGNS[i]], why: "sextile" },
    { sign: at(6), why: "opposition" },
  ];
}
