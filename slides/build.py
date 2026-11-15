"""Build the party deck: slides/dist/party-deck.html, one page that plays the host's slides full screen.

The deck is in slides/deck/, in the claude.ai Slides format it was made in:
- deck.json: the title, the slide order and the typefaces;
- deck.css: the look every slide shares, in the website's Blue futurism; its palette is vibes/tokens.css,
  which the build puts in front of it, so the deck and the website share one source;
- slides/<id>.html: one <section id="<id>"> per slide, speaker notes in its <aside>.
Pictures are in slides/assets/. Slides point at files by paths relative to slides/dist/, the folder of the
built page, so ../assets/x.jpg is a picture and ../../video/dist/media/six-facts-720p.mp4 is the show reel preview.

The build checks that every slide in the order exists and every picture and film it points at is in the repo.
Nothing is fetched. Run from anywhere: python3 -I slides/build.py
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DECK = HERE / "deck"
DIST = HERE / "dist"
OUT = DIST / "party-deck.html"
SLOTS = ("<!--FONTS-->", "/*VIBES_TOKENS*/", "/*DECK*/", "<!--SLIDES-->")
TOKENS = ROOT / "vibes" / "tokens.css"


def main():
    deck = json.loads((DECK / "deck.json").read_text(encoding="utf8"))
    css = (DECK / "deck.css").read_text(encoding="utf8")
    tpl = (HERE / "template.html").read_text(encoding="utf8")
    for slot in SLOTS:
        if slot not in tpl:
            sys.exit(f"slides/template.html is missing the {slot} slot")

    parts, missing, with_notes = [], [], 0
    for sid in deck["order"]:
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", sid):
            sys.exit(f"deck.json: bad slide id {sid!r}")
        f = DECK / "slides" / f"{sid}.html"
        if not f.exists():
            sys.exit(f"deck.json lists {sid}, but {f.relative_to(ROOT)} is missing")
        html = f.read_text(encoding="utf8").strip()
        if not html.startswith(f'<section id="{sid}"') or not html.endswith("</section>"):
            sys.exit(f"{f.relative_to(ROOT)}: must be exactly one <section id=\"{sid}\">")
        for ref in re.findall(r'(?:src|poster)="([^"]+)"', html):
            if re.match(r"(https?:|data:|about:)", ref):
                continue
            if not (DIST / ref.split("#")[0]).resolve().is_file():
                missing.append(f"{sid}: {ref}")
        with_notes += "<aside>" in html
        parts.append(html)
    if missing:
        sys.exit("files the slides point at are missing:\n  " + "\n  ".join(missing))

    fonts = "\n".join(f'<link rel="stylesheet" href="{face["href"]}">'
                      for face in deck["faces"].values() if face.get("href"))
    page = (tpl.replace(SLOTS[0], fonts, 1)
               .replace(SLOTS[1], TOKENS.read_text(encoding="utf8").strip(), 1)
               .replace(SLOTS[2], css.strip(), 1)
               .replace(SLOTS[3], "\n".join(parts), 1))
    DIST.mkdir(exist_ok=True)
    OUT.write_text(page, encoding="utf8")
    print(f"{OUT.relative_to(ROOT)}: {len(parts)} slides, {with_notes} with speaker notes, {len(page) // 1024} KB")


if __name__ == "__main__":
    main()
