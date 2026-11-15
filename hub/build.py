"""Build the front page of the Future Party 2050 folder, and the admin page beside it.

Reads the real numbers from the other projects (the Big Wall, quotes, ideas, tweets, pictures, soundtrack, film renders)
and writes the pages from template.html and admin.html. Run from anywhere:

    python3 -I hub/build.py          # rebuilds the Big Wall, then ../index.html and ../admin.html (work offline)
    python3 -I hub/site.py           # site/, the website Vercel serves (calls build(web=True) and admin(web=True))

The front page is for everyone: the wall, the music, the apps and the research. The admin page holds what only
the host needs (the pre-flight list, the short addresses, the pieces kept off the front page and how to rebuild each one).
No page links to it: open admin.html in the folder, or /admin on the website (it forwards to /admin.html). Nothing here is fetched from the network.
"""
import importlib.util, json, re, shutil, subprocess, sys
from datetime import date
from pathlib import Path

sys.dont_write_bytecode = True  # loading wall/build.py below would otherwise leave wall/__pycache__ in the repo
HUB = Path(__file__).resolve().parent
ROOT = HUB.parent

SITE = "https://www.vargafutureparty.com"
REPO = "https://github.com/SecurityQQ/future-party"
DOWNLOAD = REPO + "/releases/download"

# The claude.ai copies of the pages (private, need a login). The folder's pages link them as "online".
ONLINE = {
    "program": "https://claude.ai/artifact/GTAQtSieprLL7VaHcbwBVC",
    "futurists": "https://claude.ai/artifact/P2jenFADX1YbeZjJm9eJpW",
    "futurists_short": "https://claude.ai/artifact/K7mQoafbtuLc9f1NQuMc1X",
    "futurists_ru": "https://claude.ai/artifact/G2pBtXXsKGaz5rDnuL5Zmn",
    "films": "https://claude.ai/artifact/EX8V3LEzvAEtW2p2y2NLBu",
    "further": "https://claude.ai/artifact/8zQjJUnHQXxsWWD1aQKYnx",
    "books": "https://claude.ai/artifact/1P94dXNkbjwjofDd2DzaUi",
    "tweets": "https://claude.ai/artifact/M6b8HYpuvdwA4cU4GvEfqG",
    "soundtrack": "https://claude.ai/artifact/WfgPk8RRF5sTM8spzwC1zp",
    "why": "https://claude.ai/artifact/Abby2s8iw3xuiJQX9Qwfph",
    "resonance": "https://claude.ai/artifact/PVooRbA3UqweX19eBy7Q4k",
    "contact": "https://claude.ai/artifact/AiFrTg6V1BipqTvsJTmkmA",
    "tea": "https://claude.ai/artifact/JSq3U75PR1zGnLmkPea8Yz",
    "mirror_research": "https://claude.ai/artifact/EQ2izi4He8XwvMRmsknaqs",
    "concept": "https://claude.ai/artifact/Dqk9BpYrVUoFXQaiyfHKBD",
    "deck": "https://claude.ai/artifact/BkSJQMeXHfnDBZJaYmezXP",
}
# Where each of those pages lives in this repo. hub/site.py points every claude.ai link at these copies.
# "tea" (a claude.ai sheet) has no copy here.
PAGES = {
    "program": "programme/tea-with-tomorrow.html",
    "futurists": "tweets/research/futurists-on-2050.html",
    "futurists_short": "tweets/research/2050-in-futurists-tweets.html",
    "futurists_ru": "tweets/research/2050-in-futurists-tweets.ru.html",
    "films": "reel/projection-2050.html",
    "further": "video/dist/further-2050.html",
    "books": "books/dist/book-projection-2050.html",
    "tweets": "tweets/dist/tweets-2050.html",
    # Soundtrack 2050, Fable 5.2's playlist about the future (the party's running order)
    "soundtrack": "music/dist/soundtrack2050.html",
    # Music of the Future, the host's own picks, with a player in the page
    "future_music": "music/dist/music-of-the-future.html",
    "why": "music/dist/why-music-changes.html",
    "resonance": "music/resonance/dist/local/index.html",
    # Play 2050, the Makey Makey soundboard (formerly Contact 2050; the file keeps that name)
    "contact": "soundboard/dist/contact2050.html",
    # Mirror 2050 is served from its own folder, so the site answers /mirror without a short address
    "mirror": "mirror/index.html",
    "mirror_research": "mirror/viral-webcam-effects.html",
    # Imagined Futures reads its pictures from concept-art/thumbs/, which site.py copies too
    "concept": "concept-art/imagined-futures.html",
    # The Big Wall, built by wall/build.py; site.py copies the photos and films it loads
    "bigwall": "wall/dist/big-wall.html",
    # Mars in 3D is served from its own folder (/mars3d); site.py copies its pictures, globe maps and three.js
    "mars3d": "mars3d/index.html",
    # The host's slides, built by slides/build.py; site.py copies its pictures in slides/assets
    "deck": "slides/dist/party-deck.html",
}
# Earlier claude.ai copies of the same pages.
ALIASES = {"https://claude.ai/artifact/65pctWFWHMQZ3ezNrrA7P1": "futurists_ru"}
# Short addresses on the website, for typing on the projector laptop: vargafutureparty.com/wall
SHORT = {
    "wall": PAGES["bigwall"],
    "apps": "index.html#apps",
    "quotes": "books/dist/quote-wall.html#quote-wall",
    "ideas": "books/dist/quote-wall.html#projection",
    "mix": "books/dist/quote-wall.html#mix-wall",
    "tweets": "tweets/dist/tweet-wall.html#tweet-wall",
    "tweets-short": "tweets/dist/tweet-wall.html#short-wall",
    "art": PAGES["concept"] + "#wall",
    "mars": PAGES["mars3d"],
    "play": PAGES["contact"],
    "soundboard": PAGES["contact"],
    "soundtrack": PAGES["soundtrack"],
    "future-music": PAGES["future_music"],
    "resonance": PAGES["resonance"],
    "music-history": PAGES["why"],
    "books": PAGES["books"],
    "further": PAGES["further"],
    "films": PAGES["films"],
    "futurists": PAGES["futurists"],
    "programme": PAGES["program"],
    "slides": PAGES["deck"],
}
# The picture in the Slides section: the deck's "Tonight at the party" slide
DECK_SHOT = "slides/assets/preview.jpg"
# The party app, The Future 2050 (app/ in this repo), is served at /app on the same site; link its home page, never /app/admin.
APPS = {"party": SITE + "/app"}
PLAYLISTS = {
    # "Fable 5.2 · a playlist about the future" (Soundtrack 2050), unlisted
    "soundtrack": "https://www.youtube.com/playlist?list=PLJdg5B9vQ1oA",
    # "Music of the Future", the host's picks in the order of music/future_music.json, unlisted
    "future": "https://www.youtube.com/playlist?list=PLeCO8iyYgFSo",
    "history": "https://www.youtube.com/playlist?list=PLeo45sxoQ8gE",
    "resonance": "https://www.youtube.com/playlist?list=PLSfq0dmq_K78",
}
# The previews of the Apps section, 1280x720: made by hub/apps/previews.py, except Mars in 3D's own picture
APP_SHOTS = {"party": "hub/apps/app.jpg", "mirror": "hub/apps/mirror.jpg", "music": "hub/apps/music.jpg",
             "play": "hub/apps/play.jpg", "mars": "mars3d/preview.jpg", "art": "hub/apps/art.jpg"}
# The picture on the Imagined Futures tile: the Prometheus Ring, a spinning habitat orbiting Saturn
ART_TILE = "concept-art/thumbs/2118267091262333357-1.jpg"
# The photo behind the Big Wall tile: Earth seen through Saturn's rings, Further's last slide
WALL_TILE = "video/assets/photos/smiled.jpg"


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf8"))


def words(s):
    return len(str(s).split())


def probe(rel):
    """Duration (s) and size (MB) of a film file, or None if it is missing. Without ffprobe the duration is None
    and the page reads it from the video itself."""
    p = ROOT / rel
    if not p.exists():
        return None
    out = {"mb": round(p.stat().st_size / 1048576), "sec": None}
    ff = shutil.which("ffprobe") or "/usr/local/bin/ffprobe"
    try:
        r = subprocess.run([ff, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                           capture_output=True, text=True, timeout=20)
        out["sec"] = round(float(r.stdout.strip()), 1)
    except Exception:
        pass
    return out


def books_numbers():
    quotes = load("books/quotes.json")
    q_loop = sum(max(8, 3 + 0.34 * words(x["q"])) for x in quotes)
    tpl = (ROOT / "books/template.html").read_text(encoding="utf8")
    ideas = re.findall(r"\{bl:'\w+',h:'([^']*)',t:'([^']*)'", tpl)
    i_loop = sum(max(8, 2.3 + 0.3 * words(h + " " + t)) for h, t in ideas)
    return {"quotes": len(quotes), "quote_books": len({x["b"] for x in quotes}), "quote_loop": round(q_loop),
            "first_quote": quotes[0]["q"], "ideas": len(ideas), "idea_loop": round(i_loop),
            "first_idea": ideas[0][0] if ideas else ""}


def tweets_numbers():
    t = load("tweets/tweets.json")
    def clean(x):
        txt = x["text"]
        return x.get("group") == "core" and "[link]" not in txt and "@" not in txt and 60 <= len(txt) <= 180 and not txt.rstrip().endswith(":")
    first = next((x for x in t["tweets"] if clean(x)), t["tweets"][0])
    author = t["authors"].get(first["h"], {}) if isinstance(t["authors"], dict) else {}
    return {"tweets": len(t["tweets"]), "authors": len(t["authors"]), "blocks": len(t["blocks"]),
            "sample": (first.get("wall") or [first["text"]])[0] if isinstance(first.get("wall"), list) else first["text"],
            "sample_by": author.get("name") or first["h"]}


def concept_numbers():
    posts = load("concept-art/tweets.json")
    return {"pictures": sum(len(p["photos"]) for p in posts), "posts": len(posts), "tile": ART_TILE}


def mars3d_numbers():
    s = load("mars3d/slides.json")
    return {"pictures": sum(len(c["slides"]) for c in s["chapters"]), "missions": len(s["chapters"])}


def soundtrack_numbers():
    s = load("music/soundtrack.json")
    secs = sum(t.get("d") or 0 for t in s["tracks"])
    return {"tracks": len(s["tracks"]), "bench": len(s.get("bench", [])), "sec": secs}


def future_music_numbers():
    f = load("music/future_music.json")
    part = {c["id"]: c["part"] for c in f["chapters"]}
    secs = lambda p: sum(t["d"] for t in f["tracks"] if part[t["ch"]] == p)
    return {"tracks": len(f["tracks"]), "sec": sum(t["d"] for t in f["tracks"]),
            "evening": secs("evening"), "late": secs("late")}


def wall_numbers():
    """The Big Wall's chapters and loop length, from the manifest wall/build.py writes."""
    m = ROOT / "wall/dist/manifest.json"
    if not m.exists():
        return None
    w = json.loads(m.read_text(encoding="utf8"))
    return {"total": w["total"], "slides": w["slides"], "counts": w["counts"], "files": w["files"], "tile": WALL_TILE,
            "highlights": w["highlights"],
            "chapters": [{k: c[k] for k in ("id", "title", "color", "sec")} for c in w["chapters"]]}


def build_wall():
    """Rebuild the Big Wall from its six sources, so the front page never shows an old one."""
    spec = importlib.util.spec_from_file_location("wall_build", ROOT / "wall/build.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.main()


def films_list(web):
    """The films. The folder plays the 1080p renders and falls back to the 720p previews kept in the repo;
    the website always plays the previews and links the 1080p masters on the GitHub releases.
    "front": shown on the front page; the others are on the admin page only."""
    films = [
        {"id": "further", "title": "Further", "sub": "the wall film", "t": 8, "front": True,
         "file": "video/renders/further-2050-1080p.mp4", "preview": "video/dist/media/further-720p.mp4", "poster": "video/dist/media/further-poster.jpg",
         "master": DOWNLOAD + "/v3.0/further-2050-1080p.mp4",  # Blue futurism cut; v2.0 holds the orange one
         "about": "Sixteen claims for 2030–2050, each over a photo of what already exists. Silent.",
         "page": PAGES["further"], "online": ONLINE["further"], "rebuild": "cd video && npm run render"},
        {"id": "sixfacts", "title": "Six Facts", "sub": "the show reel", "t": 9, "front": True,
         "file": "showreel/renders/six-facts-2050-1080p.mp4", "preview": "video/dist/media/six-facts-720p.mp4", "poster": "video/dist/media/six-facts-poster.jpg",
         "master": DOWNLOAD + "/v3.0/six-facts-2050-1080p.mp4",
         "about": "Six facts about how books guess the future, with music, over NASA footage.",
         "page": None, "online": None, "rebuild": "cd showreel && npm run render"},
        {"id": "roast", "title": "The Roast", "sub": "how v1 became v2", "t": 12, "front": False,
         "file": "roast/renders/the-roast-2050-1080p.mp4", "preview": "video/dist/media/the-roast-720p.mp4",
         "master": DOWNLOAD + "/v3.0/the-roast-2050-1080p.mp4",
         "about": "62 seconds: the weakest v1 slides as exhibits stamped CUT, then the recut. Has sound effects.",
         "page": None, "online": None, "rebuild": "cd roast && npm run render"},
        {"id": "already", "title": "Already Here", "sub": "the wall film, v1", "t": 30, "front": False,
         "file": "video/renders/already-here-2050-1080p.mp4", "preview": "video/dist/media/already-here-720p.mp4",
         "master": DOWNLOAD + "/v3.0/already-here-2050-1080p.mp4",
         "about": "Every shot pairs an idea a film imagined with a real photo of it existing today, in three chapters. Silent, loops seamlessly.",
         "page": None, "online": None, "rebuild": "python3 -I video/tools/build_v1.py <dir>, then render there"},
    ]
    for f in films:
        use_preview = web or not (ROOT / f["file"]).exists()
        if use_preview and (ROOT / f["preview"]).exists():
            f["file"], f["is_preview"] = f["preview"], True
        else:
            f["is_preview"] = False
        f["probe"] = probe(f["file"])
        if web:
            f["online"] = None
    return films


def fill(template, data):
    tpl = (HUB / template).read_text(encoding="utf8")
    # Blue futurism: the palette, chrome materials and timing shared with the party app and Resonance
    # (vibes/tokens.css), inlined so the pages work offline
    theme_slot = "/*VIBES_TOKENS*/"
    if theme_slot in tpl:
        tpl = tpl.replace(theme_slot, (ROOT / "vibes" / "tokens.css").read_text(encoding="utf8"), 1)
    elif template == "template.html":
        sys.exit("template.html is missing the shared vibe token slot")
    # The timeline the walls share, here for the film player (drag, click or scroll through a film)
    if "/*WALL_TIMELINE*/" in tpl:
        tpl = tpl.replace("/*WALL_TIMELINE*/", (ROOT / "vibes" / "timeline.js").read_text(encoding="utf8"), 1)
    elif template == "template.html":
        sys.exit("template.html is missing the /*WALL_TIMELINE*/ slot")
    slot = "const D=/*DATA*/{};"
    if slot not in tpl:
        sys.exit(f"{template} is missing the const D=/*DATA*/{{}}; slot")
    return tpl.replace(slot, "const D=/*DATA*/" + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + ";", 1)


def common(web):
    return {"mode": "web" if web else "folder", "site": SITE, "repo": REPO,
            "built": date.today().strftime("%-d %B %Y"),
            # The website links its own copies, so it only carries the claude.ai pages that have none
            "online": {k: v for k, v in ONLINE.items() if not web or k not in PAGES},
            "pages": PAGES, "short": SHORT, "playlists": PLAYLISTS, "apps": APPS}


def build(web=False):
    """Return the front page as a string."""
    films = films_list(web)
    b, t, s, c, w = books_numbers(), tweets_numbers(), soundtrack_numbers(), concept_numbers(), wall_numbers()
    if not w:
        sys.exit("wall/dist/manifest.json is missing: run python3 -I wall/build.py")
    data = dict(common(web), **{
        "films": [f for f in films if f["front"]],
        "books": b, "tweets": t, "sound": s, "future": future_music_numbers(), "art": c, "wall": w, "mars": mars3d_numbers(), "shots": APP_SHOTS,
        "exists": {p: (ROOT / p).exists() for p in [
            "books/dist/quote-wall.html", "tweets/dist/tweet-wall.html", "music/resonance/dist/local/player.html",
            "reel/links.md", DECK_SHOT, ART_TILE, WALL_TILE, *APP_SHOTS.values(), *PAGES.values()]},
        "deck": {"shot": DECK_SHOT, "slides": len(load("slides/deck/deck.json")["order"])},
    })
    missing = [p for p, ok in data["exists"].items() if not ok]
    page = fill("template.html", data)
    front = [f for f in films if f["front"]]
    films_ok = sum(1 for f in front if f["probe"])
    previews = sum(1 for f in front if f["probe"] and f["is_preview"])
    print(f"{'site' if web else 'folder'} front page: the Big Wall ({w['total'] // 60} min), {films_ok}/{len(front)} films ({previews} as 720p previews), "
          f"{b['quotes']} quotes, {b['ideas']} ideas, {t['tweets']} tweets, {c['pictures']} pictures, {s['tracks']} tracks"
          + (f"; missing: {missing}" if missing else ""))
    return page


def admin(web=False):
    """Return the admin page as a string: the host's page, linked from nowhere."""
    films = films_list(web)
    # The admin page reuses the front page's style block. The front page itself never names the admin page.
    tpl = (HUB / "template.html").read_text(encoding="utf8")
    css = re.search(r"<style>.*?</style>", tpl, re.S).group(0).replace(
        "/*VIBES_TOKENS*/", (ROOT / "vibes" / "tokens.css").read_text(encoding="utf8"), 1)
    data = dict(common(web), **{"films": films, "wall": wall_numbers(),
                                "exists": {p: (ROOT / p).exists() for p in PAGES.values()}})
    page = fill("admin.html", data).replace("<!--CSS-->", css, 1)
    print(f"{'site' if web else 'folder'} admin page: {sum(1 for f in films if f['probe'])}/{len(films)} films, {len(SHORT)} short addresses")
    return page


def main():
    build_wall()
    (ROOT / "index.html").write_text(build(web=False), encoding="utf8")
    (ROOT / "admin.html").write_text(admin(web=False), encoding="utf8")


if __name__ == "__main__":
    main()
