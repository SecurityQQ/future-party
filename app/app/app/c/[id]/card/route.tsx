import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { findPlayer, styleLabel } from "@/lib/character";

// The picture a shared Kin link shows on X and in messengers: 1200 × 630, the Kin whole (X cuts a 3:4 picture
// to its middle band, at the eyes), its name, whose Kin it is, its prophecy, and the party's address.
// /app/c/<card number>/card; app/app/app/c/[id]/page.tsx puts it in the page's Open Graph and X tags.
// Fonts: the site's faces as static TTF (Satori reads no WOFF2), from Google Fonts, SIL Open Font License.
const FONTS = join(process.cwd(), "assets", "fonts");
const font = (file: string) => readFile(join(FONTS, file));

const INK = "#edf4ff", ICE = "#9dd8ff", FG2 = "#c4d4ec", LINE = "rgba(145,174,210,.75)";
const RARITY: Record<string, string> = { common: "#c4d4ec", rare: "#9dd8ff", epic: "#c8b6ff", legendary: "#f4c58d" };

// The name in capitals, as large as its longest word allows in the left column
function nameSize(name: string): number {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 1);
  return Math.max(44, Math.min(88, Math.floor(620 / (longest * 0.86))));
}

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ") > n * 0.6 ? cut.lastIndexOf(" ") : n).replace(/[\s,;:.–-]+$/, "") + "…";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await findPlayer((await params).id);
  if (!p?.image_url) return new Response("No Kin picture yet", { status: 404 });
  const src = await fetch(p.image_url);
  if (!src.ok) return new Response("The Kin picture did not load", { status: 502 });
  const kin = await sharp(Buffer.from(await src.arrayBuffer())).resize(840, 1120, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
  const [unbounded, geo4, geo6, mono] = await Promise.all([
    font("Unbounded-600.ttf"), font("Geologica-400.ttf"), font("Geologica-600.ttf"), font("MartianMono-500.ttf"),
  ]);

  const first = p.name.split(" ")[0];
  const no = String(p.card_no).padStart(3, "0");
  const size = nameSize(p.character);
  const prophecy = p.prophecy ? clip(p.prophecy, 130) : null;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", overflow: "hidden", color: INK, fontFamily: "Geologica",
        backgroundImage: "radial-gradient(circle at 78% 30%, #17345f 0%, #0b1b36 38%, #030817 78%)" }}>
        <div style={{ position: "absolute", left: 600, top: 150, width: 720, height: 300, borderRadius: "50%",
          border: "1.5px solid rgba(157,216,255,.3)", transform: "rotate(-18deg)" }} />
        <div style={{ display: "flex", flexDirection: "column", width: 700, height: 630, padding: "62px 0 54px 72px" }}>
          <div style={{ fontFamily: "Martian Mono", fontSize: 19, letterSpacing: 3, color: ICE }}>{`VARGA FUTURE PARTY · KIN #${no}`}</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 26, fontFamily: "Unbounded", fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.03, textTransform: "uppercase" }}>
            {p.character}
          </div>
          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 600, color: "#cce9ff" }}>{`${first}’s Kin for 2050`}</div>
          {prophecy && <div style={{ marginTop: 14, fontSize: 24, lineHeight: 1.4, color: FG2, maxWidth: 590 }}>{`“${prophecy}”`}</div>}
          <div style={{ display: "flex", alignItems: "center", marginTop: "auto", fontFamily: "Martian Mono", fontSize: 22, color: FG2 }}>
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke={ICE} strokeWidth="1.6" style={{ marginRight: 14 }}>
              <circle cx="16" cy="16" r="7" />
              <ellipse cx="16" cy="16" rx="15" ry="5" transform="rotate(-25 16 16)" />
            </svg>
            vargafutureparty.com
          </div>
        </div>
        <div style={{ position: "absolute", right: 76, top: 44, width: 405, height: 542, display: "flex", borderRadius: 24, overflow: "hidden",
          border: `2px solid ${LINE}`, boxShadow: "0 30px 80px rgba(0,0,0,.55)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/jpeg;base64,${kin.toString("base64")}`} width={405} height={542} style={{ objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", padding: "8px 14px", borderRadius: 999,
            background: "rgba(3,8,23,.78)", border: `1px solid ${RARITY[p.rarity] ?? FG2}`, color: RARITY[p.rarity] ?? FG2,
            fontFamily: "Martian Mono", fontSize: 15, letterSpacing: 2 }}>
            {`${p.rarity} · ${styleLabel(p.style)}`.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Unbounded", data: unbounded, weight: 600, style: "normal" },
        { name: "Geologica", data: geo4, weight: 400, style: "normal" },
        { name: "Geologica", data: geo6, weight: 600, style: "normal" },
        { name: "Martian Mono", data: mono, weight: 500, style: "normal" },
      ],
      // The address carries the picture's version (?v=), so a redrawn Kin gets a new card
      headers: { "cache-control": "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
