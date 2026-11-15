"""Write site/, the Varga Future Party 2050 website. The app's build runs it on every deploy (npm run site in app/,
which copies site/ into app/public/: one Next.js project serves the site and the party app at /app).

The site keeps the repo's paths, so every relative link works the same as in the folder:
- index.html is the front page in web mode: the 720p films, the 1080p masters on the GitHub releases, no claude.ai links;
- admin.html is the host's page (pre-flight, short addresses, the pieces off the front page), linked from nowhere;
  /admin forwards to it, so it keeps the front page's relative links;
- every page in build.PAGES, the two walls and the Resonance player are copied. A page saved as a claude.ai
  fragment (no <!doctype>) gets the same document shell the books and tweets builds use for their wall pages;
- every page first made in the orange look is dressed in the site's Blue futurism (vibes/restyle.py), so the whole
  site looks like the front page even if a build wrote one of them in the old look;
- every claude.ai link to one of these pages points at the copy on the site instead;
- the 720p films and posters in video/dist/media are copied, and the photos the Big Muse loads (wall/dist/manifest.json);
- each short address in build.SHORT gets a page that forwards to it: /quotes, /tweets, /programme ...;
- every page gets what a shared link shows (title, description, Open Graph and Twitter card, icons; hub/seo.py),
  and the site gets the share cards and icons from hub/og/, robots.txt, sitemap.xml and llms.txt.

Run from anywhere: python3 -I hub/site.py, then serve site/ (python3 -m http.server -d site).
Only files in the repo are read; nothing is fetched.
"""
import importlib.util, re, shutil, sys
from pathlib import Path

sys.dont_write_bytecode = True  # loading build.py below would otherwise leave hub/__pycache__ in the repo
HUB = Path(__file__).resolve().parent
ROOT = HUB.parent
OUT = ROOT / "site"

_spec = importlib.util.spec_from_file_location("hub_build", HUB / "build.py")
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)
_spec = importlib.util.spec_from_file_location("hub_seo", HUB / "seo.py")
SEO = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SEO)
_spec = importlib.util.spec_from_file_location("vibes_restyle", ROOT / "vibes" / "restyle.py")
VIBES = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(VIBES)

PAGES = sorted(set(B.PAGES.values()) | {
    "books/dist/quote-wall.html", "tweets/dist/tweet-wall.html", "music/resonance/dist/local/player.html"})
MEDIA = "video/dist/media"
# Other files the pages load from the repo: the Mirror 2050 preview, the Blue futurism chrome texture, Mars in 3D's
# slides, Trip 2050's data, the previews of the Apps section, the figures of the 2050 Research papers (the front page
# and the end of every research page show them), and every file the Big Muse lists in its manifest (Further's photos;
# its films are in MEDIA)
ASSETS = (["mirror/preview.jpg", "vibes/assets/chrome-orbit.webp", "mars3d/slides.js", "trip/data.js", "trip/presets.js",
           B.TRIP_SHOT, *B.APP_SHOTS.values()]
          + [p["shot"] for p in B.research_papers()]
          + B.load("wall/dist/manifest.json")["files"])
# Folders the pages load from: the Imagined Futures pictures (concept-art/images/, the originals, stay off the site)
# and Mars in 3D's pictures, globe maps and three.js (mars3d/raw/, the originals, stay off the site),
# the party slides' pictures, and Trip 2050's portraits and Butterchurn (it also plays concept-art/thumbs)
ASSET_DIRS = ["concept-art/thumbs", "mars3d/img", "mars3d/globe", "mars3d/vendor", "slides/assets", "trip/portraits",
              "trip/vendor"]
SHELL = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
         '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
         '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n')

# claude.ai page -> its path on this site
TO_SITE = {url: "/" + B.PAGES[k] for k, url in B.ONLINE.items() if k in B.PAGES}
TO_SITE.update({url: "/" + B.PAGES[k] for url, k in B.ALIASES.items()})
CLAUDE = re.compile(r"https://claude\.ai/artifact/[A-Za-z0-9]+")


def html_page(rel):
    s = (ROOT / rel).read_text(encoding="utf8")
    if not s.lstrip()[:15].lower().startswith("<!doctype"):
        s = SHELL + s + "\n</html>\n"
    if rel in VIBES.PAGES:
        # Pages first made in the orange look wear the site's Blue futurism (vibes/restyle.py), even if a build
        # rewrote them in the old look
        s = VIBES.restyle(s, rel)
    return CLAUDE.sub(lambda m: TO_SITE.get(m.group(0), m.group(0)), s)


def forward(target):
    url = "/" + target
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Varga Future Party 2050</title>'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url={url}">'
            f'<script>location.replace({url!r})</script></head>'
            '<body style="margin:0;padding:24px 16px;background:#030817;color:#edf4ff;font:16px/1.5 system-ui,sans-serif">'
            f'<a href="{url}" style="color:#9dd8ff">Open {target.split("#")[0].rsplit("/", 1)[-1]}</a></body></html>\n')


def main():
    missing = [p for p in PAGES if not (ROOT / p).exists()]
    if missing:
        sys.exit(f"missing pages, build them first: {missing}")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    seo = lambda rel, s, **kw: SEO.page(rel, s, B.PAGES, **kw)
    (OUT / "index.html").write_text(seo("index.html", B.build(web=True)), encoding="utf8")
    (OUT / "admin.html").write_text(seo("admin.html", B.admin(web=True)), encoding="utf8")
    (OUT / "admin").mkdir()
    (OUT / "admin" / "index.html").write_text(seo("admin/index.html", forward("admin.html"), target="admin.html"),
                                              encoding="utf8")
    for rel in PAGES:
        dst = OUT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(seo(rel, html_page(rel)), encoding="utf8")
    shutil.copytree(ROOT / MEDIA, OUT / MEDIA, ignore=shutil.ignore_patterns(".*"))
    for rel in ASSET_DIRS:
        shutil.copytree(ROOT / rel, OUT / rel, ignore=shutil.ignore_patterns(".*"))
    for rel in ASSETS:
        if (OUT / rel).exists():
            continue
        (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, OUT / rel)
    for name, target in B.SHORT.items():
        # /programme, /books and /tweets are also folders of the site: the forward becomes their index page
        if (OUT / name / "index.html").exists() or (OUT / name).is_file():
            sys.exit(f"short address /{name} clashes with a page of the site")
        (OUT / name).mkdir(exist_ok=True)
        page = target.split("#")[0]
        (OUT / name / "index.html").write_text(
            seo(f"{name}/index.html", forward(target), target=page, source=(OUT / page).read_text(encoding="utf8")),
            encoding="utf8")
    for name, rel in SEO.FILES.items():
        shutil.copy2(ROOT / rel, OUT / name)
    (OUT / "robots.txt").write_text(SEO.robots(), encoding="utf8")
    (OUT / "sitemap.xml").write_text(SEO.sitemap(B.PAGES), encoding="utf8")
    (OUT / "llms.txt").write_text(SEO.llms(B.PAGES, lambda rel: (OUT / rel).read_text(encoding="utf8")), encoding="utf8")
    # Every picture a shared link shows must be on the site
    shown = {u for p in OUT.rglob("*.html") for u in re.findall(r'<meta property="og:image" content="([^"]+)"', p.read_text(encoding="utf8"))}
    lost = sorted(u for u in shown if not (OUT / u.removeprefix(SEO.SITE + "/")).is_file())
    if lost:
        sys.exit(f"og:image not on the site: {lost}")

    files = [p for p in OUT.rglob("*") if p.is_file()]
    left = sorted({u for p in files if p.suffix == ".html" for u in CLAUDE.findall(p.read_text(encoding="utf8"))})
    mb = sum(p.stat().st_size for p in files) / 1048576
    print(f"site/: {len(files)} files, {mb:.1f} MB, {len(PAGES)} pages, {len(B.SHORT)} short addresses"
          + (f"; claude.ai links left (no copy here): {left}" if left else ""))


if __name__ == "__main__":
    main()
