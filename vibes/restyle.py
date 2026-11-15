#!/usr/bin/env python3
"""Dress the pages first made in the orange look (Inter, JetBrains Mono, #ff5315 on #070708) in Blue futurism,
so every page of the website looks like the front page.

restyle(html, rel) returns the page with:
- tokens.css and pages.css (the palette, type and materials, mapped onto the page's own variable names), and the
  site's fonts (Unbounded, Geologica, Martian Mono; League Gothic and Instrument Serif only where the page uses them)
  in place of Inter and JetBrains Mono;
- the old orange, near-black and green literals swapped for their Blue futurism counterparts;
- the party's mark (VARGA FUTURE PARTY / 2050) at the top left, linking back to the page's section on the front page;
- on the papers of 2050 Research (hub/research/papers.json): the chrome orbit behind the title, as on the front page,
  and at the end the previous and the next paper with their figures, so the papers read as one series.

It is idempotent: what it adds sits between <!--vibes:start--> and <!--vibes:end--> (and <!--vibes:bar-->,
<!--vibes:series-->) and is replaced on every run. The builds of books/, tweets/, music/, soundboard/ and video/ call it on what they write,
hub/site.py calls it on every page in PAGES, and the hand-made pages (research, programme, Projection, Mirror) are
kept restyled in the repo. Run from anywhere:

    python3 -I vibes/restyle.py            # restyle every page in PAGES in place
    python3 -I vibes/restyle.py --check    # list the pages that are not restyled yet, exit 1 if any
"""
import argparse, html as htmlmod, importlib.util, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# page -> (name used for page-specific rules in pages.css, where the party's mark leads on the front page, label of
# that place, where the mark goes: "nav" = the page's own nav.top brand, "bar" = a bar before the first <header>,
# "body" = a bar at the start of the body, None = no mark: a full-screen app with its own way back)
PAGES = {
    "books/dist/book-projection-2050.html": ("books", "index.html#research", "2050 Research", "nav"),
    "books/dist/quote-wall.html": ("books", "index.html#wall", "The wall", "nav"),
    "tweets/dist/tweets-2050.html": ("tweets", "index.html#research", "2050 Research", "bar"),
    "tweets/dist/tweet-wall.html": ("tweets", "index.html#wall", "The wall", "bar"),
    "tweets/research/futurists-on-2050.html": ("research", "index.html#research", "2050 Research", "bar"),
    "tweets/research/2050-in-futurists-tweets.html": ("research", "index.html#research", "2050 Research", "bar"),
    "tweets/research/2050-in-futurists-tweets.ru.html": ("research", "index.html#research", "2050 Research", "bar"),
    "music/dist/soundtrack2050.html": ("soundtrack", "index.html#music", "Music", "nav"),
    "music/dist/why-music-changes.html": ("why", "index.html#music", "Music", "nav"),
    "reel/projection-2050.html": ("projection", "index.html#research", "2050 Research", "nav"),
    "video/dist/further-2050.html": ("further", "index.html#research", "2050 Research", "body"),
    "mirror/viral-webcam-effects.html": ("mirror-research", "index.html#research", "2050 Research", "body"),
    "programme/tea-with-tomorrow.html": ("programme", "admin.html", "The host’s page", "bar"),
    "mirror/index.html": ("mirror", None, None, None),
    "soundboard/dist/contact2050.html": ("play", None, None, None),
}

MARK = ('<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="16" cy="16" r="7"/>'
        '<ellipse cx="16" cy="16" rx="15" ry="5" transform="rotate(-25 16 16)"/></svg>VARGA FUTURE PARTY / 2050')

# Old literal -> Blue futurism. The accents become electric blue or ice, the near-blacks navy, the green ice.
HEX = {  # old hex -> Blue futurism; matched as #rrggbb and as %23rrggbb (inside SVG data URIs, like favicons)
    "ff5315": "4385ff", "f92f02": "cce9ff", "ff6a33": "9dd8ff", "ff6a00": "9dd8ff", "c63a05": "9dd8ff", "c2410c": "9dd8ff",
    "ffad31": "f4c58d", "67fc5c": "9dd8ff", "5ff5ff": "9dd8ff", "070708": "030817", "050506": "030817", "0e0e10": "07132b",
    "0b0b0d": "030817", "141417": "0b1b36", "151518": "0b1b36",
}
SWAPS = [(rf"(#|%23){old}\b", rf"\g<1>{new}") for old, new in HEX.items()] + [
    (r"rgba\(\s*255\s*,\s*83\s*,\s*21\s*,", "rgba(67,133,255,"), (r"rgba\(\s*255\s*,\s*173\s*,\s*49\s*,", "rgba(244,197,141,"), (r"rgba\(\s*7\s*,\s*7\s*,\s*8\s*,", "rgba(3,8,23,"),
    (r"([\"'])Aeonik\1\s*,\s*", ""), (r"([\"'])Inter\1", r"\1Geologica\1"), (r"([\"'])JetBrains Mono\1", r"\1Martian Mono\1"),
]
# Swaps for one page only: Play 2050 draws its sky on a canvas, black until now
PAGE_SWAPS = {
    "play": [(r"c\.fillStyle = '#000'", "c.fillStyle = '#030817'"), (r"linear-gradient\(#000,#000\)", "linear-gradient(#030817,#030817)")],
}
FONTS = re.compile(r'<link[^>]+href="https://fonts\.googleapis\.com/css2\?[^"]*"[^>]*>\s*')
BLOCK = re.compile(r"<!--vibes:start-->.*?<!--vibes:end-->", re.S)
BAR = re.compile(r"<!--vibes:bar-->.*?<!--/vibes:bar-->", re.S)
SERIES = re.compile(r"<!--vibes:series-->.*?<!--/vibes:series-->\n?", re.S)
NAV_BRAND = re.compile(r'(<nav class="top"[^>]*>\s*)<(span|a) class="brand[^"]*"[^>]*>.*?</\2>', re.S)


def papers():
    """The papers of 2050 Research, in order, from hub/research/papers.py (numbers filled in)."""
    sys.dont_write_bytecode = True  # loading papers.py would otherwise leave hub/research/__pycache__ in the repo
    spec = importlib.util.spec_from_file_location("research_papers", ROOT / "hub" / "research" / "papers.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.load()


_PAPERS = None


def paper_of(rel):
    """(papers, index of the paper whose page is rel or a copy of it, whether rel is a copy)."""
    global _PAPERS
    if _PAPERS is None:
        _PAPERS = papers()
    for i, p in enumerate(_PAPERS):
        if p["page"] == rel or rel in p.get("copies", []):
            return _PAPERS, i, p["page"] != rel
    return _PAPERS, None, False


def series(rel, ps, i):
    """The end of a research page: the previous and the next paper (the series wraps), and the way to all of them."""
    up_ = up(rel)
    esc = lambda x: htmlmod.escape(str(x), quote=True)

    def card(p, label):
        return (f'<a class="vb-paper" href="{esc(up_ + p["page"])}"><img src="{esc(up_ + p["shot"])}" width="1280" '
                f'height="720" loading="lazy" alt=""><span class="vb-paper-t"><span class="vb-paper-k">{label}</span>'
                f'<span class="vb-paper-id">{esc(p["id"])} · {esc(p["field"])}</span><b>{esc(p["title"])}</b>'
                f'<span class="vb-paper-f">{esc(p["finding"])}</span></span></a>')
    prev, nxt = ps[i - 1], ps[(i + 1) % len(ps)]
    return ('<!--vibes:series--><aside class="vb-series" aria-label="More from 2050 Research">'
            f'<p class="vb-series-k">2050 Research · paper {i + 1} of {len(ps)}</p><div class="vb-series-row">'
            + card(prev, "← Previous paper") + card(nxt, "Next paper →")
            + f'</div><a class="vb-series-all" href="{esc(up_)}index.html#research">All {len(ps)} papers on the front page</a>'
            '</aside><!--/vibes:series-->\n')


def font_link(html):
    fams = ["Unbounded:wght@400;500;600", "Geologica:wght@300;400;500;600;700", "Martian+Mono:wght@400;500"]
    if "League Gothic" in html:
        fams.append("League+Gothic")
    if "Instrument Serif" in html:
        fams.append("Instrument+Serif:ital@0;1")
    return ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
            + "&".join("family=" + f for f in fams) + '&display=swap">')


def up(rel):
    return "../" * rel.count("/")


def restyle(html, rel):
    if rel not in PAGES:
        raise KeyError(f"{rel} is not in vibes/restyle.py PAGES")
    name, home, label, where = PAGES[rel]
    html = SERIES.sub("", BAR.sub("", BLOCK.sub("", html)))
    ps, pi, copy = paper_of(rel)
    paper = ps[pi]["key"] if pi is not None else None
    html = FONTS.sub("", html)
    for old, new in SWAPS + PAGE_SWAPS.get(name, []):
        html = re.sub(old, new, html, flags=re.I)
    # Mark the page so pages.css applies; fragments without an <html> tag get it from the script
    m = re.search(r"<html\b[^>]*>", html, re.I)
    if m:
        tag = re.sub(r'\sdata-vibe="[^"]*"', "", m.group(0))
        tag = re.sub(r'\sdata-vibe-paper="[^"]*"', "", tag)
        extra = f' data-vibe-paper="{paper}"' if paper else ""
        html = html[:m.start()] + tag[:-1] + f' data-vibe="{name}"{extra}>' + html[m.end():]
    css = (HERE / "tokens.css").read_text(encoding="utf8") + "\n" + (HERE / "pages.css").read_text(encoding="utf8")
    if paper:
        # the chrome orbit of the front page's hero, from this page's folder
        css += f'\n:root[data-vibe-paper]{{--vb-orbit:url("{up(rel)}vibes/assets/chrome-orbit.webp")}}\n'
    # vb-file: the page is opened from the party folder, not the website (notes for the folder show only then)
    mark_js = (f'(function(d){{d.setAttribute("data-vibe","{name}");'
               + (f'd.setAttribute("data-vibe-paper","{paper}");' if paper else "")
               + 'if(location.protocol==="file:")d.classList.add("vb-file")})(document.documentElement)')
    block = ("<!--vibes:start-->" + font_link(html)
             + f'<script>{mark_js}</script>'
             + '<meta name="theme-color" content="#030817">'
             + "<style>\n/* Blue futurism: vibes/tokens.css and vibes/pages.css, put here by vibes/restyle.py */\n"
             + css + "</style>\n<!--vibes:end-->")
    html = re.sub(r'<meta name="theme-color"[^>]*>\s*', "", html)
    for at in ("</head>", "<body"):
        i = html.find(at)
        if i >= 0:
            break
    else:
        i = html.find("</style>")
        if i < 0:
            raise ValueError(f"{rel}: no </head>, <body or </style> to put the style after")
        i += len("</style>")
    html = html[:i] + block + html[i:]
    if where:
        href = up(rel) + home
        brand = f'<a class="brand vb-brand" href="{href}" title="Back to {label} on the party’s front page">{MARK}</a>'
        if where == "nav":
            html, n = NAV_BRAND.subn(lambda m: m.group(1) + brand, html, count=1)
            if not n:
                raise ValueError(f"{rel}: no <nav class=\"top\"> with a brand to turn into the party's mark")
        else:
            bar = (f'<!--vibes:bar--><div class="wrap"><nav class="vb-bar" aria-label="Varga Future Party 2050">{brand}'
                   f'<a class="vb-back" href="{href}">← {label}</a></nav></div>\n<!--/vibes:bar-->')
            anchor = re.search(r"<header\b" if where == "bar" else r"<body\b[^>]*>", html)
            if not anchor:
                raise ValueError(f"{rel}: no place for the party's mark ({where})")
            i = anchor.start() if where == "bar" else anchor.end()
            html = html[:i] + bar + html[i:]
    if paper and not copy:
        end = html.rfind("</body>")
        if end < 0:
            end = html.rfind("</html>")
        aside = series(rel, ps, pi)
        html = html + aside if end < 0 else html[:end] + aside + html[end:]
    return html


def restyle_file(path, rel=None):
    path = Path(path)
    rel = rel or path.resolve().relative_to(ROOT).as_posix()
    old = path.read_text(encoding="utf8")
    new = restyle(old, rel)
    if new != old:
        path.write_text(new, encoding="utf8")
    return new != old


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="list pages that are not restyled, exit 1 if any")
    args = ap.parse_args()
    stale = []
    for rel in PAGES:
        p = ROOT / rel
        if not p.exists():
            print("missing", rel)
            continue
        if args.check:
            s = p.read_text(encoding="utf8")
            if restyle(s, rel) != s:
                stale.append(rel)
        elif restyle_file(p, rel):
            print("restyled", rel)
    for rel in stale:
        print("NOT RESTYLED", rel)
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
