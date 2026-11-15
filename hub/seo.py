"""What a link to the website shows in messengers, social networks and search. hub/site.py runs every page through
page() and writes robots.txt and sitemap.xml from here.

Each page gets, right after its <meta charset>: a title, a description, the canonical address, Open Graph and Twitter
card tags with a picture (its own 16:9 picture when it has one, else the party's card, hub/og/site.jpg), and the
icons (hub/og/, made by hub/og/make.py). Tags a page already has are kept; its <title> becomes the one below.
Pages in HIDDEN get noindex instead and stay out of the sitemap. The party app at /app has its own tags
(app/app/layout.tsx), with the app's card, /og-app.jpg.
"""
import html, json, re

SITE = "https://vargafutureparty.com"
NAME = "Varga Future Party 2050"
# The host on X, as on the front page's Follow band: X cards name it
X = "@vargastartup"
# Files hub/site.py copies to the root of the site: site path -> repo path
FILES = {"og.jpg": "hub/og/site.jpg", "og-app.jpg": "hub/og/app.jpg",
         "favicon.ico": "hub/og/favicon.ico", "apple-touch-icon.png": "hub/og/apple-touch-icon.png"}
CARD = ("og.jpg", 1200, 630, "Varga Future Party 2050: Step into 2050. The Big Muse, music, seven apps and Mars in 3D for one night.")
WALL = ("video/assets/photos/smiled.jpg", 2304, 1296, "Earth seen through Saturn’s rings")

# The front page and every page in hub/build.py PAGES, by its key there: (title, description, picture).
# A description of None keeps the page's own <meta name="description">; a picture of None is the party's card.
META = {
    "index": (NAME, None, None),
    "bigwall": ("The Big Muse · " + NAME,
                "Every film and slide wall of the party in one loop for the projector: two films about 2050, quotes "
                "and ideas from books, futurists’ posts and concept art of the future.", WALL),
    "further": ("Further 2050 · " + NAME,
                "The wall film’s sixteen claims about 2050, each with the real seed, the date and the film that "
                "imagined it.", WALL),
    "resonance": ("History of Music 2050", None, ("hub/apps/music.jpg", 1280, 720, "History of Music 2050")),
    "contact": ("Play: 2050 · " + NAME, None, ("hub/apps/play.jpg", 1280, 720, "Play: 2050, the Makey Makey soundboard")),
    "mirror": ("Mirror 2050 · " + NAME, None, ("hub/apps/mirror.jpg", 1280, 720, "Four of Mirror 2050’s camera effects")),
    "mars3d": ("Mars in 3D · " + NAME, None, ("mars3d/preview.jpg", 1280, 720, "Mars in 3D for red/cyan glasses")),
    "trip": ("Trip 2050 · " + NAME, None,
             ("trip/preview.jpg", 1280, 720, "Four moments of Trip 2050: a kaleidoscope, four posters of Hedy Lamarr, a tunnel and a street in liquid colour")),
    "prayer": ("Prayer Room · " + NAME, None,
               ("prayer/preview.jpg", 1280, 720, "Prayer Room: an icon of Elon Musk in chrome and deep blue, with a "
                                                 "mirror halo and a small rocket, and one of his posts about 2050 beside it")),
    "concept": ("Imagined Futures · " + NAME,
                "Concept art of the future from posts on X: space colonies, cities, vehicles, robots and the people "
                "in them, from 1970s paperback covers to today’s film and game design.",
                ("hub/apps/art.jpg", 1280, 720, "Six pictures from Imagined Futures")),
    "deck": ("Party slides · " + NAME, None,
             ("slides/assets/preview.jpg", 1280, 720, "The deck’s Tonight at the party slide")),
    "future_music": ("Music of the Future · " + NAME, None, None),
    "soundtrack": ("Soundtrack 2050 · " + NAME,
                   "A playlist about the future picked by Fable 5.2: tracks and spoken voices in three blocks, each "
                   "scored for plausibility and inspiration.", None),
    "why": ("Why Music Changes · " + NAME,
            "Four thousand years of music in thirteen eras: who paid, who ruled, what people believed, and the "
            "technology and contact that changed the sound.", None),
    "books": ("Book Projection 2050 · " + NAME,
              "Eighteen authoritative books about the world around 2050, scored for authority, plausibility and "
              "inspiration, with their ideas and verified quotes.", None),
    "tweets": ("2050 in Tweets · " + NAME,
               "Every post behind the party’s tweet wall: what futurists wrote about 2050 on X, by topic and author, "
               "with filters.", None),
    "futurists": ("Futurists on 2050 · " + NAME,
                  "What futurists and others wrote about 2050, in their own words: the full research behind the "
                  "party’s tweet wall.", None),
    "futurists_short": ("2050 in Futurists’ Tweets · " + NAME,
                        "Six findings about 2050 with their numbers, and 43 verbatim posts by futurists, by theme.", None),
    "futurists_ru": ("2050 в твитах футуристов · " + NAME,
                     "Шесть выводов о 2050 годе с цифрами и 43 поста футуристов по темам.", None),
    "films": ("Projection 2050 · " + NAME,
              "Eighteen films about 2050 scored for plausibility and beauty, with checked clips for a reel.", None),
    "mirror_research": ("Viral Webcam Effects · " + NAME,
                        "Which camera effects went viral on X and how they are built: 18 posts with their numbers, "
                        "the research behind Mirror 2050.", None),
}
# Other pages on the site, by repo path
EXTRA = {
    "books/dist/quote-wall.html": ("Quote wall · " + NAME,
                                   "Quotes and ideas about 2050 from eighteen books, as a slide wall that runs by itself.", None),
    "tweets/dist/tweet-wall.html": ("Tweet wall · " + NAME,
                                    "Futurists’ posts about 2050 from X, as a slide wall that runs by itself.", None),
}
# Host-only and embedded pages: noindex, not in the sitemap
HIDDEN = {"admin.html", "programme/tea-with-tomorrow.html", "music/resonance/dist/local/player.html"}
LOCALE = {"tweets/research/2050-in-futurists-tweets.ru.html": "ru_RU"}

DESC = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"\s*/?>', re.I)
TITLE = re.compile(r"<title>.*?</title>\n?", re.I | re.S)
CHARSET = re.compile(r"<meta\s+charset=[^>]*>", re.I)


def url(rel):
    return SITE + "/" + ("" if rel == "index.html" else rel)


def table(pages):
    """repo path -> (title, description, picture), from META keyed by hub/build.py PAGES."""
    out = {"index.html": META["index"], **EXTRA}
    out.update({rel: META[k] for k, rel in pages.items() if k in META})
    return out


def tags(rel, page, meta):
    """The head tags for page rel, whose HTML is page."""
    a = lambda s: html.escape(s, quote=True)
    title, desc, pic = meta
    own = DESC.search(page)
    desc = desc or (html.unescape(own.group(1)) if own else None)
    pic = pic or CARD
    img = SITE + "/" + pic[0]
    out = [f"<title>{a(title)}</title>"]
    if desc and not own:
        out.append(f'<meta name="description" content="{a(desc)}">')
    out += [f'<link rel="canonical" href="{a(url(rel))}">',
            f'<meta property="og:type" content="website">',
            f'<meta property="og:site_name" content="{NAME}">',
            f'<meta property="og:locale" content="{LOCALE.get(rel, "en_US")}">',
            f'<meta property="og:url" content="{a(url(rel))}">',
            f'<meta property="og:title" content="{a(title)}">']
    if desc:
        out.append(f'<meta property="og:description" content="{a(desc)}">')
    out += [f'<meta property="og:image" content="{a(img)}">',
            f'<meta property="og:image:width" content="{pic[1]}">',
            f'<meta property="og:image:height" content="{pic[2]}">',
            f'<meta property="og:image:type" content="image/jpeg">',
            f'<meta property="og:image:alt" content="{a(pic[3])}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:site" content="{X}">',
            f'<meta name="twitter:title" content="{a(title)}">']
    if desc:
        out.append(f'<meta name="twitter:description" content="{a(desc)}">')
    out += [f'<meta name="twitter:image" content="{a(img)}">',
            f'<meta name="twitter:image:alt" content="{a(pic[3])}">',
            '<link rel="icon" href="/favicon.ico" sizes="48x48">',
            '<link rel="apple-touch-icon" href="/apple-touch-icon.png">']
    if rel == "index.html":
        site = {"@context": "https://schema.org", "@type": "WebSite", "name": NAME, "alternateName": "Future Party 2050", "url": SITE + "/",
                "description": desc, "inLanguage": "en"}
        out.append('<script type="application/ld+json">' + json.dumps(site, ensure_ascii=False) + "</script>")
    return out


def insert(page, block):
    """Put block right after <meta charset> (the first thing in every page's head), and drop the old <title>."""
    page = TITLE.sub("", page, count=1)
    m = CHARSET.search(page)
    if not m:
        raise ValueError("a page without <meta charset>")
    return page[:m.end()] + "\n" + "\n".join(block) + "\n" + page[m.end():].lstrip("\n")


def page(rel, s, pages, target=None, source=None):
    """Page rel (its HTML is s) with its tags. A short address is a forward page: target is the page it forwards to
    and source that page's HTML, whose tags it gets, so a shared /wall shows the Big Muse."""
    key = (target or rel).split("#")[0]
    if key in HIDDEN or rel in HIDDEN:
        if re.search(r'<meta\s+name="robots"', s, re.I):
            return s
        return insert(s, [m.group(0) for m in [TITLE.search(s)] if m] + ['<meta name="robots" content="noindex">'])
    meta = table(pages).get(key)
    if meta is None:
        raise SystemExit(f"hub/seo.py has no title and description for {key}: add it to META or EXTRA")
    block = tags(key, source or s, meta)
    if target:
        # The forward's canonical is the page it forwards to, which has the description and the site's JSON-LD
        block = [t for t in block if not t.startswith(('<meta name="description"', '<script'))]
    return insert(s, block)


def robots():
    # /app/t/<code> opens a pass and records a scan, so crawlers stay out of it; /api is the app's API
    return ("User-agent: *\nDisallow: /api/\nDisallow: /app/t/\nDisallow: /t/\nDisallow: /app/admin\n\n"
            f"Sitemap: {SITE}/sitemap.xml\n")


def sitemap(pages):
    rels = ["index.html", *sorted(r for r in table(pages) if r != "index.html" and r not in HIDDEN)]
    urls = [url(r) for r in rels] + [SITE + "/app"]
    body = "".join(f"<url><loc>{html.escape(u)}</loc></url>\n" for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")


# /llms.txt (llmstxt.org): the site in a few lines for AI assistants and answer engines, by front-page section
REPO = "https://github.com/SecurityQQ/future-party"
SUMMARY = ("Varga Future Party 2050 is a party set in the year 2050, and this site holds everything for the night: the Big "
           "Muse, the wall that plays every film and slide wall in one loop on the projector, the music, seven apps for the "
           "guests (the party App, webcam effects played with the hands, a Makey Makey soundboard, Mars for "
           "red/cyan 3D glasses, a gallery of concept art, a prayer room with an icon that answers) and the research behind it: books, futurists' posts and "
           "films about 2050, each with its sources. Nothing needs a login.")
APP = ("The Future 2050 (party app)", SITE + "/app",
       "The party App. Tap your pass, meet your Kin (a zodiac creature from 2050), and collect the Kin of "
       "everyone you meet; a live ranking counts the cards each traveler has scanned.")
GROUPS = [("The night", ["index", "bigwall", "trip", "further", "deck"]),
          ("Apps", ["app", "mirror", "resonance", "contact", "mars3d", "concept", "prayer"]),
          ("Music", ["future_music", "soundtrack", "why"]),
          ("Research", ["books", "tweets", "futurists", "futurists_short", "films", "mirror_research"])]


def llms(pages, built):
    """built(rel) is the site's page rel, for the descriptions the pages carry themselves."""
    def line(key):
        if key == "app":
            return "- [{}]({}): {}".format(*APP)
        rel = "index.html" if key == "index" else pages[key]
        title, desc, _ = META[key]
        own = DESC.search(built(rel))
        desc = desc or html.unescape(own.group(1))
        return f"- [{title.removesuffix(' · ' + NAME)}]({url(rel)}): {desc}"
    out = [f"# {NAME}", "", f"> {SUMMARY}", ""]
    for head, keys in GROUPS:
        out += [f"## {head}", "", *map(line, keys), ""]
    out += ["## Source", "",
            f"- [GitHub repository]({REPO}): the code and data behind every page, with how to rebuild each one",
            f"- [Film releases]({REPO}/releases): the 1080p masters of the wall films", ""]
    return "\n".join(out)
