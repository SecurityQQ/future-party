"""Build the front page of the Future Party 2050 folder.

Reads the real numbers from the other projects (quotes, ideas, tweets, soundtrack, film renders)
and writes the page from template.html. Run from anywhere:

    python3 -I hub/build.py          # ../index.html, the folder's front page (works offline)
    python3 -I hub/site.py           # site/, the website Vercel serves (calls build(web=True))

Nothing here is fetched from the network.
"""
import json, re, shutil, subprocess, sys
from datetime import date
from pathlib import Path

HUB = Path(__file__).resolve().parent
ROOT = HUB.parent

SITE = "https://future-party-2050.vercel.app"
REPO = "https://github.com/SecurityQQ/future-party"
DOWNLOAD = REPO + "/releases/download"

# The claude.ai copies of the pages (private, need a login). The folder's front page links them as "online".
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
    "soundtrack": "music/dist/soundtrack2050.html",
    "why": "music/dist/why-music-changes.html",
    "resonance": "music/resonance/dist/local/index.html",
    "contact": "soundboard/dist/contact2050.html",
}
# Earlier claude.ai copies of the same pages.
ALIASES = {"https://claude.ai/artifact/65pctWFWHMQZ3ezNrrA7P1": "futurists_ru"}
# Short addresses on the website, for typing on the projector laptop: future-party-2050.vercel.app/quotes
SHORT = {
    "programme": PAGES["program"],
    "quotes": "books/dist/quote-wall.html#quote-wall",
    "ideas": "books/dist/quote-wall.html#projection",
    "mix": "books/dist/quote-wall.html#mix-wall",
    "tweets": "tweets/dist/tweet-wall.html#tweet-wall",
    "tweets-short": "tweets/dist/tweet-wall.html#short-wall",
    "soundboard": PAGES["contact"],
    "soundtrack": PAGES["soundtrack"],
    "resonance": PAGES["resonance"],
    "music-history": PAGES["why"],
    "books": PAGES["books"],
    "further": PAGES["further"],
    "films": PAGES["films"],
    "futurists": PAGES["futurists"],
}
PLAYLISTS = {
    "soundtrack": "https://www.youtube.com/playlist?list=PLJdg5B9vQ1oA",
    "history": "https://www.youtube.com/playlist?list=PLeo45sxoQ8gE",
    "resonance": "https://www.youtube.com/playlist?list=PLSfq0dmq_K78",
}


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


def soundtrack_numbers():
    s = load("music/soundtrack.json")
    secs = sum(t.get("d") or 0 for t in s["tracks"])
    return {"tracks": len(s["tracks"]), "bench": len(s.get("bench", [])), "sec": secs}


def films_list(web):
    """The three films. The folder plays the 1080p renders and falls back to the 720p previews kept in the repo;
    the website always plays the previews and links the 1080p masters on the GitHub releases."""
    films = [
        {"id": "further", "title": "Further", "sub": "the wall film, v2", "t": 8,
         "file": "video/renders/further-2050-1080p.mp4", "preview": "video/dist/media/further-720p.mp4",
         "master": DOWNLOAD + "/v2.0/further-2050-1080p.mp4",
         "about": "Sixteen bold claims for 2030–2050, each with a dated real seed and a film that imagined it, over 37 public-domain and CC photos. Silent, loops seamlessly.",
         "page": PAGES["further"], "online": ONLINE["further"], "rebuild": "cd video && npm run render"},
        {"id": "roast", "title": "The Roast", "sub": "how v1 became v2", "t": 12,
         "file": "roast/renders/the-roast-2050-1080p.mp4", "preview": "video/dist/media/the-roast-720p.mp4",
         "master": DOWNLOAD + "/v2.0/the-roast-2050-1080p.mp4",
         "about": "62 seconds: the weakest v1 slides as exhibits stamped CUT, then the recut. Made for the gap between loops. Has sound effects.",
         "page": None, "online": None, "rebuild": "cd roast && npm run render"},
        {"id": "already", "title": "Already Here", "sub": "the wall film, v1", "t": 30,
         "file": "video/renders/already-here-2050-1080p.mp4", "preview": "video/dist/media/already-here-720p.mp4",
         "master": DOWNLOAD + "/v1.0/already-here-2050-1080p.mp4",
         "about": "Every shot pairs an idea a film imagined with a real photo of it existing today, in three chapters. Silent, loops seamlessly. Kept as the alternate.",
         "page": None, "online": None, "rebuild": "see video/README and slides_v1.json"},
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


def doc(web, rel):
    """A Markdown file or folder: on the website it opens on GitHub, in the folder it opens from disk."""
    return f"{REPO}/blob/main/{rel}" if web else rel


def resources(web, films, b, t, s):
    """Every resource in one list, grouped: [group, [[title, about, tag, [[label, href], ...]], ...]]."""
    film = {f["id"]: f for f in films}
    def play(f):
        links = [["play", f["file"]]] if f["probe"] else []
        if web or f["is_preview"]:
            links.append(["1080p master ↓", f["master"]])
        return links
    return [
        ["On the wall", [
            ["Further", "The wall film, v2. 16 claims for 2030–2050, silent loop.", "", play(film["further"]) + [["page", PAGES["further"]]]],
            ["The Roast", "How v1 became v2, 62 seconds with sound.", "", play(film["roast"])],
            ["Already Here", "The wall film, v1. Three chapters, silent loop.", "", play(film["already"])],
            ["Quote wall", f"{b['quotes']} verbatim quotes from {b['quote_books']} books.", "", [["start", SHORT["quotes"]]]],
            ["Idea wall", f"{b['ideas']} slides of plausible ideas for 2050.", "", [["start", SHORT["ideas"]], ["quotes and ideas", SHORT["mix"]]]],
            ["Tweet wall", f"{t['tweets']} posts by {t['authors']} futurists on X.", "", [["start", SHORT["tweets"]], ["short version", SHORT["tweets-short"]]]],
        ]],
        ["The evening", [
            ["Tea With Tomorrow", "The programme: a three-hour Futures Literacy Lab over tea, with a party clock.", "", [["open", PAGES["program"]]]],
            ["Contact 2050", "A Makey Makey soundboard for guests: 12 pins, 8 kits, jam mode, stage mode for the projector.", "", [["open", PAGES["contact"]], ["README", doc(web, "soundboard/README.md")]]],
            ["Tea comparison", "The teas for the tables, compared.", "claude.ai", [["open ↗", ONLINE["tea"]]]],
        ]],
        ["Sound", [
            ["Soundtrack 2050", f"The running order: {s['tracks']} tracks and voices in three blocks.", "", [["page", PAGES["soundtrack"]], ["YouTube ↗", PLAYLISTS["soundtrack"]]]],
            ["Resonance", "Music history and what comes next: 60 stops, a Future Lab and a radio.", "", [["page", PAGES["resonance"]], ["YouTube ↗", PLAYLISTS["resonance"]]]],
            ["Why Music Changes", "Four thousand years in thirteen eras.", "", [["page", PAGES["why"]], ["YouTube ↗", PLAYLISTS["history"]]]],
        ]],
        ["Research", [
            ["Book Projection 2050", "Eighteen books about the world around 2050, with their ideas and quotes.", "", [["page", PAGES["books"]]]],
            ["2050 in 78 Tweets", "Every tweet behind the tweet wall, by topic and author.", "", [["page", PAGES["tweets"]]]],
            ["Futurists on 2050", "The full research: what futurists wrote about 2050, in their own words.", "", [["page", PAGES["futurists"]]]],
            ["2050 in Futurists’ Tweets", "The short version: six findings and 43 tweets by theme.", "", [["English", PAGES["futurists_short"]], ["Russian", PAGES["futurists_ru"]]]],
            ["Further 2050", "The wall film’s claims with their seeds, dates and films.", "", [["page", PAGES["further"]]]],
            ["Projection 2050", "Eighteen films about 2050, scored, with checked clips for a reel.", "", [["page", PAGES["films"]], ["reel notes", doc(web, "reel/links.md")]]],
        ]],
        ["Tools and source", [
            ["Zodiac Creatures playground", "Tunes the prompt behind the zodiac companion characters. Runs on a local server.", "local", [["README", doc(web, "astrology/playground/README.md")]]],
            ["The repository", "Every page, data file and build script, and the film masters on the releases.", "", [["GitHub ↗", REPO], ["releases ↗", REPO + "/releases"]]],
        ]],
    ]


def build(web=False):
    """Return the page as a string."""
    films = films_list(web)
    b, t, s = books_numbers(), tweets_numbers(), soundtrack_numbers()
    data = {
        "mode": "web" if web else "folder",
        "site": SITE, "repo": REPO,
        "built": date.today().strftime("%-d %B %Y"),
        # The website links its own copies, so it only carries the claude.ai pages that have none
        "online": {k: v for k, v in ONLINE.items() if not web or k not in PAGES},
        "pages": PAGES, "short": SHORT, "playlists": PLAYLISTS,
        "films": films,
        "books": b, "tweets": t, "sound": s,
        "resources": resources(web, films, b, t, s),
        "exists": {p: (ROOT / p).exists() for p in [
            "books/dist/quote-wall.html", "books/dist/book-projection-2050.html", "tweets/dist/tweet-wall.html",
            "tweets/dist/tweets-2050.html", "music/resonance/dist/local/player.html",
            "reel/links.md", *PAGES.values()]},
    }
    missing = [p for p, ok in data["exists"].items() if not ok]
    tpl = (HUB / "template.html").read_text(encoding="utf8")
    slot = "const D=/*DATA*/{};"
    if slot not in tpl:
        sys.exit("template.html is missing the const D=/*DATA*/{}; slot")
    page = tpl.replace(slot, "const D=/*DATA*/" + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + ";", 1)
    films_ok = sum(1 for f in films if f["probe"])
    previews = sum(1 for f in films if f["probe"] and f["is_preview"])
    print(f"{'site' if web else 'folder'} page: {films_ok}/3 films ({previews} as 720p previews), {b['quotes']} quotes, {b['ideas']} ideas, "
          f"{t['tweets']} tweets, {s['tracks']} tracks" + (f"; missing: {missing}" if missing else ""))
    return page


def main():
    (ROOT / "index.html").write_text(build(web=False), encoding="utf8")


if __name__ == "__main__":
    main()
