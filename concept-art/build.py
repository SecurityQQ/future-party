"""Build Imagined Futures, the concept-art wall, from tweets.json and curation.json (written by fetch.py).

Run: python3 -I build.py
Writes three copies of the same page:
  imagined-futures.html                  the page to publish and the one the website serves; it reads thumbs/ from beside it
  dist/imagined-futures-standalone.html  one file with every picture inside it, to send or open anywhere;
                                         the viewer loads a large copy from X when online
  index.html                             the copy for this folder; it opens offline and shows the
                                         originals from images/ (run fetch.py first on a new machine)
"""
import base64, io, json, re, sys
from collections import Counter
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
# Blue futurism, the site's palette and materials (vibes/README.md), inlined so every copy works offline
TOKENS = HERE.parent / "vibes" / "tokens.css"
# The timeline every wall shares (drag, click or scroll through the loop)
TIMELINE = HERE.parent / "vibes" / "timeline.js"
EMBED_PX, EMBED_Q = 460, 72  # pictures inside the standalone file
AI_WORDS = r"#?\bai\s?art\b|\bmidjourney\b|\bstable diffusion\b|\bai[- ]generated\b|\bnano banana\b"  # a post saying it is AI-made


def check(posts):
    errors = []
    for p in posts:
        for k in ("id", "url", "handle", "date", "theme", "era", "photos"):
            if not p.get(k): errors.append(f"{p.get('id')}: missing {k}")
        for ph in p["photos"]:
            if not (HERE / ph["thumb"]).exists(): errors.append(f"{p['id']}: no {ph['thumb']}")
    ids = [p["id"] for p in posts]
    if len(ids) != len(set(ids)): errors.append("duplicate post ids")
    return errors


def embedded(thumb):
    with Image.open(HERE / thumb) as im:
        im = im.convert("RGB")
        im.thumbnail((EMBED_PX, EMBED_PX), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=EMBED_Q, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def data(posts, full):
    out = []
    for p in posts:
        out.append({
            "id": p["id"], "url": p["url"], "handle": p["handle"], "name": p["name"], "date": p["date"],
            "text": p["text"], "likes": p["likes"], "reposts": p["reposts"], "views": p.get("views"),
            "theme": p["theme"], "era": p["era"], "ai": p["ai"], "artist": p.get("artist"), "desc": p.get("desc", ""),
            "photos": [{"t": embedded(ph["thumb"]) if full == "remote" else ph["thumb"],
                        "f": ph["file"] if full == "local" else ph["src"], "w": ph["w"], "h": ph["h"]}
                       for ph in p["photos"]],
        })
    return out


def summary(posts, curation):
    group = lambda t: "other" if t in ("nature", "abstract") else t
    themes = Counter()
    eras = Counter()
    for p in posts:
        themes[group(p["theme"])] += len(p["photos"])
        eras[p["era"]] += len(p["photos"])
    by_acc = {}
    for p in posts:
        a = by_acc.setdefault(p["handle"].lower(), {"handle": p["handle"], "name": p["name"], "posts": 0, "photos": 0})
        a["posts"] += 1; a["photos"] += len(p["photos"])
    accounts = sorted(by_acc.values(), key=lambda a: (-a["posts"], a["handle"].lower()))
    top4 = {a["handle"] for a in accounts[:4]}
    return {
        "top4_posts": sum(1 for p in posts if p["handle"] in top4),
        "top4_credited": sum(1 for p in posts if p["handle"] in top4 and p.get("artist")),
        "themes": themes.most_common(),
        "eras": {"retro": eras["retro"], "contemporary": eras["contemporary"]},
        "accounts": accounts,
        "top4_share": round(100 * sum(a["posts"] for a in accounts[:4]) / len(posts)),
        "uncredited": sum(1 for p in posts if not p.get("artist")),
        "ai_posts": sum(1 for p in posts if p["ai"]),
        "ai_said": sum(1 for p in posts if p["ai"] and re.search(AI_WORDS, p["text"], re.I)),
        "curation": curation,
    }


def main():
    posts = json.loads((HERE / "tweets.json").read_text(encoding="utf8"))
    curation = json.loads((HERE / "curation.json").read_text(encoding="utf8"))
    collected = json.loads((HERE / "picks.json").read_text(encoding="utf8")).get("collected", "")
    errors = check(posts)
    if errors:
        print("\n".join(errors)); sys.exit(1)
    stats = {
        "photos": sum(len(p["photos"]) for p in posts),
        "posts": len(posts),
        "accounts": len({p["handle"].lower() for p in posts}),
        "artists": len({p["artist"].strip().lower() for p in posts if p.get("artist")}),
        "collected": collected,
    }
    summ = summary(posts, curation)
    tpl = (HERE / "template.html").read_text(encoding="utf8")
    for slot in ("/*ART*/null", '/*FULL*/"orig"', "/*VIBES_TOKENS*/", "/*WALL_TIMELINE*/"):
        if tpl.count(slot) != 1:
            print(f"template.html needs exactly one {slot} slot"); sys.exit(1)
    tpl = tpl.replace("/*VIBES_TOKENS*/", TOKENS.read_text(encoding="utf8"), 1)
    tpl = tpl.replace("/*WALL_TIMELINE*/", TIMELINE.read_text(encoding="utf8"), 1)

    def page(full):
        art = {"stats": stats, "summary": summ, "posts": data(posts, full)}
        js = json.dumps(art, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        return tpl.replace("/*ART*/null", js, 1).replace('/*FULL*/"orig"', json.dumps(full), 1)

    shell = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
             '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n')
    out = HERE / "dist"; out.mkdir(exist_ok=True)
    pub = page("orig")
    (HERE / "imagined-futures.html").write_text(pub, encoding="utf8")
    solo = shell + page("remote") + "\n</html>\n"
    (out / "imagined-futures-standalone.html").write_text(solo, encoding="utf8")
    (HERE / "index.html").write_text(shell + page("local") + "\n</html>\n", encoding="utf8")
    print(f"{stats['photos']} pictures, {stats['posts']} posts, {stats['accounts']} accounts, {stats['artists']} artists; "
          f"top 4 accounts {', '.join(a['handle'] for a in summ['accounts'][:4])} = {summ['top4_share']}% of posts\n"
          f"page {len(pub) // 1024} KB, standalone {len(solo) / 2**20:.1f} MB -> imagined-futures.html, dist/, index.html")


if __name__ == "__main__":
    main()
