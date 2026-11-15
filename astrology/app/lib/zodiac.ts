import presets from "./presets.json";

export type Sign = (typeof presets.zodiac)[number];

export const GLYPH: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export const ELEMENT_ICON: Record<string, string> = { fire: "🜂", earth: "🜃", air: "🜁", water: "🜄" };

// "1994-04-27" -> Taurus. Ranges come from the playground zodiac table (Capricorn wraps the new year).
export function signFor(birthday: string): Sign {
  const md = birthday.slice(5, 10);
  for (const z of presets.zodiac) {
    const wraps = z.from > z.to;
    if (wraps ? md >= z.from || md <= z.to : md >= z.from && md <= z.to) return z;
  }
  return presets.zodiac[0];
}

export function validBirthday(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  const y = d.getUTCFullYear();
  return y >= 1900 && y <= new Date().getUTCFullYear();
}
