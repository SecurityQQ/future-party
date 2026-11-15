"""Build the roast-and-recut page (dist/further-2050.html) from ROAST.md, slides.json and frames.

v1 frames: snapshots/roast-v1/fNN.jpg (one per v1 slide, from the v1 render).
v2 frames: snapshots/recut-v2/sNN.jpg (one per v2 slide, from the v2 render; make them with --frames).
Writes dist/further-2050.html (standalone, opens from disk) and dist/further-2050-artifact.html
(the same page without the document skeleton, for publishing). Videos play from dist/media/.
Run: python3 -I tools/page.py [--frames]
"""
import base64, html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, CARD, BURST, SLIDE, INTRO = 30, 36, 10, 105, 105
RENDER = os.path.join(ROOT, "renders", "further-2050-1080p.mp4")

SOURCES = {
 "nif": [("DOE: fusion ignition at NIF, Dec 2022", "https://www.energy.gov/articles/doe-national-laboratory-makes-history-achieving-fusion-ignition"),
         ("CFS plans a 400 MW plant in Virginia, early 2030s", "https://www.datacenterdynamics.com/en/news/commonwealth-fusion-systems-hopes-to-build-first-grid-scale-fusion-power-plant-in-virginia-by-early-2030s")],
 "mammoth": [("Bloomberg: Colossal's woolly mouse, Mar 2025", "https://www.bloomberg.com/news/articles/2025-03-04/startup-trying-to-un-extinct-prehistoric-mammoth-creates-woolly-mouse"),
             ("Bangkok Post: mammoth calf plan for 2028 on track", "https://bangkokpost.com/world/2973541/de-extinction-startup-says-mammoth-revival-plan-on-track")],
 "jewel": [("Dezeen: Jewel Changi and its 40 m Rain Vortex, 2019", "https://www.dezeen.com/2019/04/12/jewel-changi-airport-singapore-safdie-architects-waterfall/")],
 "atlas": [("Physics Today: CERN Council backs the 91 km FCC-ee", "https://physicstoday.aip.org/news/if-cern-can-come-up-with-the-requisite-billions-the-future-circular-collider-is-a-go"),
           ("CERN: Future Circular Collider", "https://home.cern/fr/science/accelerators/future-circular-collider")],
 "aurora": [("CNBC: UN panel says the ozone layer is recovering, Jan 2023", "https://www.cnbc.com/2023/01/09/the-earths-ozone-layer-is-slowly-recovering-un-report-finds-.html")],
 "starship": [("NPR: booster caught on first attempt, Oct 2024", "https://www.npr.org/2024/10/13/nx-s1-5151788/spacex-starship-booster-caught-first-launch")],
 "moon": [("OPB/AP: Artemis II splashdown, Apr 2026", "https://www.opb.org/article/2026/04/10/artemis-ii-astronauts-return-from-moon-with-a-splashdown-to-close-out-a-record-breaking-lunar-voyage"),
          ("NASA: the Earthset photo, art002e009288", "https://images.nasa.gov/details/art002e009288")],
 "torus": [("Commons: Stanford torus interior, NASA Ames 1975", "https://commons.wikimedia.org/wiki/File:Stanford_torus_interior.jpg")],
 "elevator": [("Japan Times: Obayashi plans a space elevator for 2050", "https://www.japantimes.co.jp/news/2012/02/23/national/obayashi-planning-nanotube-space-elevator-in-2050/")],
 "bennu": [("Spaceflight Now: OSIRIS-REx capsule lands, Sep 2023", "https://spaceflightnow.com/2023/09/24/osiris-rex-sample-return-capsule-safely-lands-in-utah/")],
 "marsbase": [("Cosmos: MOXIE makes oxygen on Mars, Apr 2021", "https://cosmosmagazine.com/space/exploration/nasa-moxie-mars-oxygen")],
 "havoc": [("NASA NTRS: HAVOC study", "https://ntrs.nasa.gov/citations/20160006580"),
           ("Wikipedia: HAVOC", "https://en.wikipedia.org/wiki/High_Altitude_Venus_Operational_Concept")],
 "europa": [("Live Science: Europa Clipper launches, arrives 2030", "https://www.livescience.com/space/space-exploration/europa-clipper-blasts-off-whats-next-for-nasas-biggest-ever-interplanetary-spacecraft")],
 "elt": [("ESO: ELT first light March 2029, science Dec 2030", "https://eso.org/public/announcements/ann25001/")],
 "sail": [("Scientific American: inside Breakthrough Starshot", "https://www.scientificamerican.com/article/inside-the-breakthrough-starshot-mission-to-alpha-centauri/")],
 "smiled": [("Commons: The Day the Earth Smiled, PIA17172", "https://commons.wikimedia.org/wiki/File:The_Day_the_Earth_Smiled_-_PIA17172.jpg")],
}

CAVEATS = [
 "The years are editorial forecasts built on stated targets, not promises. Colossal's 2028 calf would be a gene-edited Asian elephant, not a true mammoth. CFS's early-2030s plant needs SPARC to work and a grid review that can take four to six years.",
 "Obayashi's own engineer said 2050 is \"not our goal or promise\". CERN's final FCC decision is due around 2028. The ELT's first light is planned for March 2029.",
 "HAVOC was a NASA Langley concept study, never a funded mission. Starshot is a research programme with no launch date.",
 "The space-elevator image is a screenshot from the game Ace Combat 7 (Bandai Namco, CC BY 3.0). It is credited on screen as a game image.",
 "The Venus slide is darkened so the orange line passes contrast on a washed-out projector, which costs some of the bright cloud deck.",
 "There are no AI-generated images and no sound. Both are deliberate, and both can be added.",
]


def b64(path, w=480):
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={w}:-2", "-q:v", "5", "-f", "image2", "-c:v", "mjpeg", "pipe:1"],
                         check=True, capture_output=True).stdout
    return "data:image/jpeg;base64," + base64.b64encode(out).decode()


def v2_frames(d):
    os.makedirs(os.path.join(ROOT, "snapshots", "recut-v2"), exist_ok=True)
    t, n = INTRO, 0
    for ch in d["chapters"]:
        f = t + CARD + len(ch["burst"]) * BURST
        for sl in ch["slides"]:
            hold = int(round(sl.get("hold", SLIDE / FPS) * FPS))
            at = (f + 75) / FPS
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{at:.3f}", "-i", RENDER, "-frames:v", "1",
                            "-vf", "scale=960:-2", "-q:v", "3", os.path.join(ROOT, "snapshots", "recut-v2", f"s{n:02d}.jpg")], check=True)
            f += hold
            n += 1
        t = f


def roast_rows():
    rows = []
    for line in open(os.path.join(ROOT, "ROAST.md")):
        m = re.match(r"\| (\d+) \| (.+?) \| (.+?) \| (.+?) \|$", line.strip())
        if m:
            rows.append((int(m.group(1)), m.group(2), m.group(3), m.group(4)))
    return rows


def e(s):
    return html.escape(s, quote=True)


def main():
    d = json.load(open(os.path.join(ROOT, "slides.json")))
    credits = json.load(open(os.path.join(ROOT, "assets", "photos", "credits.json")))
    for k, label in (("torus", "Commons: Stanford torus interior, NASA Ames 1975"), ("smiled", "Commons: The Day the Earth Smiled, PIA17172")):
        SOURCES[k] = [(label, credits[k]["page"])]
    if "--frames" in sys.argv:
        v2_frames(d)
    rows = roast_rows()
    verdict_class = {"Cut": "cut", "Burst only": "burst", "Burst": "burst", "Keep, promote": "keep", "Replace": "swap", "Replace the closer": "swap"}
    roast_html = []
    for n, slide, roast, verdict in rows:
        img = b64(os.path.join(ROOT, "snapshots", "roast-v1", f"f{n:02d}.jpg"), 320)
        roast_html.append(f'<li class="r"><img src="{img}" alt="v1 slide {n}: {e(slide)}" loading="lazy" width="320" height="180">'
                          f'<div class="rt"><p class="rn"><span class="num">{n:02d}</span> {e(slide)}</p><p>{e(roast)}</p></div>'
                          f'<span class="chip {verdict_class.get(verdict, "cut")}">{e(verdict)}</span></li>')
    counts = {}
    for *_, v in rows:
        k = verdict_class.get(v, "cut")
        counts[k] = counts.get(k, 0) + 1
    cards, n = [], 0
    for ch in d["chapters"]:
        cards.append(f'<h3 class="chap"><span>{e(ch["num"])}</span> {e(ch["word"])}</h3><div class="grid">')
        for sl in ch["slides"]:
            img = b64(os.path.join(ROOT, "snapshots", "recut-v2", f"s{n:02d}.jpg"), 640)
            film = f' · {e(sl["film"])}' if sl.get("film") else ""
            seed_y = sl.get("seed_year") or sl.get("label", "Now")
            links = "".join(f'<a href="{e(u)}" target="_blank" rel="noopener">{e(t)}</a>' for t, u in SOURCES.get(sl["key"], []))
            cards.append(f'<article class="card"><img src="{img}" alt="{e(sl["hero"])}" loading="lazy" width="640" height="360">'
                         f'<div class="cb"><p class="yr">{e(sl["year"])}<i>{film}</i></p><h4>{e(sl["hero"])}</h4>'
                         f'<p class="seed"><b>{e(seed_y)}</b> {e(sl["seed"])}</p><p class="src">{links}</p>'
                         f'<p class="cr">{e(sl["credit"])}</p></div></article>')
            n += 1
        cards.append("</div>")
    total_slides = n
    page = TEMPLATE.format(
        roast="".join(roast_html), cards="".join(cards), caveats="".join(f"<li>{e(c)}</li>" for c in CAVEATS),
        n_cut=counts.get("cut", 0), n_burst=counts.get("burst", 0), n_keep=counts.get("keep", 0) + counts.get("swap", 0),
        n_v2=total_slides)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    # artifact body: the publish step adds the document skeleton
    art = os.path.join(ROOT, "dist", "further-2050-artifact.html")
    open(art, "w").write(page)
    # standalone page for the project: opens from disk in any browser
    head, body = page.split("</style>", 1)
    doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
           + head + "</style>\n</head>\n<body>" + body + "</body>\n</html>\n")
    out = os.path.join(ROOT, "dist", "further-2050.html")
    open(out, "w").write(doc)
    print(out, round(len(doc) / 1e6, 2), "MB;", art)


TEMPLATE = """<title>Further 2050</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=League+Gothic&family=Inter:wght@400;500;600;700;800&display=swap">
<style>
/* Layout: a projection-room page. One dark wall, the frames themselves carry the colour; one orange accent for years. */
:root {{
  --wall: #0b0b0d; --panel: #141417; --line: rgba(255,255,255,.10); --ink: #f4f4f2; --muted: #a1a1a6; --accent: #ff5315;
  --display: 'League Gothic', 'Oswald', 'Arial Narrow', sans-serif; --text: 'Inter', system-ui, -apple-system, sans-serif;
  color-scheme: dark;
}}
* {{ box-sizing: border-box }}
body {{ background: var(--wall); color: var(--ink); font: 400 16px/1.55 var(--text); margin: 0 }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 40px 72px }}
a {{ color: var(--ink); text-decoration-color: rgba(255,83,21,.6); text-underline-offset: 3px }}
a:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px }}
.kick {{ font: 700 13px/1.2 var(--text); letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin: 0 }}
h1 {{ font: 400 clamp(72px, 14vw, 168px)/.86 var(--display); text-transform: uppercase; margin: 10px 0 18px; letter-spacing: .01em }}
h2 {{ font: 400 clamp(40px, 6vw, 64px)/.95 var(--display); text-transform: uppercase; margin: 64px 0 8px; text-wrap: balance }}
.lede {{ font-size: 20px; line-height: 1.5; max-width: 62ch; margin: 0 }}
.lede b {{ color: var(--accent); font-weight: 700 }}
.stats {{ display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 28px 0 0; padding: 0; list-style: none }}
.stats li {{ display: flex; flex-direction: column }}
.stats strong {{ font: 400 56px/1 var(--display); font-variant-numeric: tabular-nums }}
.stats span {{ color: var(--muted); font-size: 14px }}
.sub {{ color: var(--muted); max-width: 66ch; margin: 0 0 24px }}
.files {{ margin-top: 28px; color: var(--muted); font-size: 14px }}
.files code {{ color: var(--ink); background: var(--panel); padding: 2px 6px; border-radius: 6px; word-break: break-all }}
ol.roast {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; background: var(--line); border-block: 1px solid var(--line) }}
.r {{ display: grid; grid-template-columns: 200px minmax(0, 1fr) auto; gap: 18px; align-items: center; background: var(--wall); padding: 12px 0 }}
.r img {{ width: 200px; height: auto; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; display: block; max-width: 100% }}
.rt p {{ margin: 0; color: var(--muted); font-size: 15px; max-width: 70ch }}
.rt .rn {{ color: var(--ink); font-weight: 600; margin-bottom: 4px }}
.num {{ font-variant-numeric: tabular-nums; color: var(--muted); margin-right: 6px }}
.chip {{ font: 700 12px/1 var(--text); letter-spacing: .08em; text-transform: uppercase; padding: 7px 10px; border-radius: 999px; white-space: nowrap; border: 1px solid var(--line) }}
.chip.cut {{ color: var(--muted); text-decoration: line-through; text-decoration-color: rgba(255,255,255,.35) }}
.chip.burst, .chip.swap {{ color: var(--ink) }}
.chip.keep {{ color: #111; background: var(--ink); border-color: var(--ink) }}
.chap {{ font: 400 34px/1 var(--display); text-transform: uppercase; margin: 40px 0 16px; letter-spacing: .02em }}
.chap span {{ font: 700 13px/1 var(--text); letter-spacing: .14em; color: var(--accent); vertical-align: 8px; margin-right: 8px }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 20px }}
.card {{ background: var(--panel); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-width: 0 }}
.card img {{ width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover; display: block }}
.cb {{ padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; min-width: 0 }}
.yr {{ font: 800 13px/1.2 var(--text); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin: 0 }}
.yr i {{ font-style: normal; color: var(--muted); font-weight: 700 }}
.card h4 {{ font: 400 34px/1 var(--display); text-transform: uppercase; margin: 0; text-wrap: balance }}
.seed {{ margin: 0; font-size: 15px }}
.seed b {{ font-variant-numeric: tabular-nums; margin-right: 6px; letter-spacing: .06em }}
.src {{ margin: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px }}
.cr {{ margin: 0; color: var(--muted); font-size: 12px }}
ul.cav {{ max-width: 72ch; padding-left: 20px; color: var(--ink) }}
.watch {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 20px; margin-top: 28px }}
.film {{ margin: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0 }}
.film video {{ width: 100%; height: auto; aspect-ratio: 16/9; background: #000; border-radius: 10px; display: block; max-width: 100% }}
.film figcaption {{ display: flex; flex-direction: column; gap: 2px }}
.film b {{ font: 400 30px/1 var(--display); text-transform: uppercase; letter-spacing: .02em }}
.film span {{ color: var(--muted); font-size: 14px }}
ul.cav li {{ margin-bottom: 10px }}
@media (max-width: 640px) {{
  .r {{ grid-template-columns: 112px minmax(0, 1fr); gap: 12px }}
  .r img {{ width: 112px }}
  .r .chip {{ grid-column: 2; justify-self: start }}
  .lede {{ font-size: 18px }}
}}
</style>
<div class="wrap">
  <p class="kick">Projection 2050 · the wall film, recut</p>
  <h1>Further</h1>
  <p class="lede">The first cut, <i>Already Here</i>, showed the present dressed as the future: a 1982 river gate, a 2004 train, two lab printers and a lettuce. The recut is <b>{n_v2} bold claims for 2030 to 2050</b>. Each one sits on a real seed that has already happened and on the most beautiful free image of it, from observatories, NASA artists and night photography.</p>
  <ul class="stats">
    <li><strong>{n_cut}</strong><span>v1 slides cut</span></li>
    <li><strong>{n_burst}</strong><span>demoted to burst frames</span></li>
    <li><strong>{n_v2}</strong><span>new claims, each with a dated seed</span></li>
    <li><strong>37</strong><span>images, all PD, CC0 or CC</span></li>
    <li><strong>74.6 s</strong><span>seamless 1080p loop, silent</span></li>
  </ul>
  <div class="watch">
    <figure class="film"><video controls loop muted playsinline preload="metadata" poster="media/further-poster.jpg" src="media/further-720p.mp4"></video>
      <figcaption><b>Further</b><span>The wall film. 74.6 s seamless loop, silent, 16 claims. Play it fullscreen on repeat.</span></figcaption></figure>
    <figure class="film"><video controls playsinline preload="metadata" poster="media/roast-poster.jpg" src="media/the-roast-720p.mp4"></video>
      <figcaption><b>The roast</b><span>How v1 became v2. 62.7 s with sound: 11 exhibits stamped, then the recut.</span></figcaption></figure>
  </div>
  <p class="files">Previews here are 720p. Full 1080p masters: <code>video/renders/further-2050-1080p.mp4</code> and <code>roast/renders/the-roast-2050-1080p.mp4</code>. Notes: <code>video/ROAST.md</code>, credits <code>video/CREDITS.md</code>.</p>

  <h2>The roast</h2>
  <p class="sub">One frame per v1 slide, taken from the render, so this is what guests actually saw. Verdicts: cut, kept only as a one-third-second burst frame, or kept and promoted.</p>
  <ol class="roast">{roast}</ol>

  <h2>The recut</h2>
  <p class="sub">Each slide states a target year, a film that genuinely imagined it, the claim, then the seed: a dated fact that makes the claim less crazy than it sounds. Frames are from the final render.</p>
  {cards}

  <h2>How far to trust it</h2>
  <ul class="cav">{caveats}</ul>
</div>
"""

if __name__ == "__main__":
    main()
