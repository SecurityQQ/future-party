"""The papers of 2050 Research, read from papers.json with their numbers filled in.

Two builds read them: hub/build.py puts them on the front page (the paper space and the paper cards), and
vibes/restyle.py ends every research page on its neighbours in the series. Each paper gets its number in the series
(2050.001 ...) and its figure, hub/research/<key>.jpg, made by hub/research/figures.py.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def numbers():
    tweets = json.loads((ROOT / "tweets/tweets.json").read_text(encoding="utf8"))
    quotes = json.loads((ROOT / "books/quotes.json").read_text(encoding="utf8"))
    return {"tweets": len(tweets["tweets"]), "authors": len(tweets["authors"]), "quotes": len(quotes)}


def load():
    raw = json.loads((HERE / "papers.json").read_text(encoding="utf8"))["papers"]
    n = numbers()
    fill = lambda v: v.format(**n) if isinstance(v, str) else v
    papers = []
    for i, p in enumerate(raw, 1):
        p = {k: fill(v) for k, v in p.items()}
        p["n"] = int(p["n"])
        if p["also"]:
            p["also"] = [fill(x) for x in p["also"]]
        p["id"] = f"2050.{i:03d}"
        p["shot"] = f"hub/research/{p['key']}.jpg"
        papers.append(p)
    return papers
