// The three oracles of the Arrival Station who read your stars while your Kin materializes.
export const ASTROLOGERS = {
  VEXA: { key: "VEXA", name: "Vexa Orrin", title: "Star Cartographer", img: "/img/vexa.webp", color: "var(--r-epic)" },
  GRUMM: { key: "GRUMM", name: "Grumm Tal", title: "Keeper of the Archive", img: "/img/grumm.webp", color: "var(--chrome)" },
  ILU: { key: "ILU", name: "Ilu", title: "Oracle of Probabilities", img: "/img/ilu.webp", color: "var(--cyan)" },
} as const;

export type Speaker = keyof typeof ASTROLOGERS | "PROPHECY";
export type Segment = { who: Speaker; text: string };

// Split streamed text "VEXA: ...\nGRUMM: ...\nILU: ...\nPROPHECY: ..." into segments.
export function parseReading(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /(^|\n)\s*(VEXA|GRUMM|ILU|PROPHECY)\s*:\s*/g;
  const marks: { who: Speaker; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) marks.push({ who: m[2] as Speaker, start: m.index, end: m.index + m[0].length });
  let seen = new Set<Speaker>();
  marks.forEach((mk, i) => {
    const body = text.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : undefined).trim();
    // A speaker appearing twice means the server restarted with the fallback reading.
    if (seen.has(mk.who)) {
      out.length = 0;
      seen = new Set();
    }
    seen.add(mk.who);
    out.push({ who: mk.who, text: body });
  });
  return out;
}
