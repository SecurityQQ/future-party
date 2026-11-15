"""Build The Big Wall: every piece on the wall in one loop, chapter by chapter, like one long show reel.

It reads the six pieces from their own folders, so it never drifts from them:
- Six Facts      showreel/reel.json             the six facts (number, line, source)
- Further        video/slides.json              the sixteen predictions, over their photos in video/assets/photos/
- Quote wall     books/quotes.json              the fifty verbatim quotes (books from books/template.html)
- Idea wall      books/template.html            the twenty-five ideas
- Tweet wall     tweets/tweets.json             the seventy-eight posts (avatars from tweets/avatars/, embedded)
- Imagined Futures concept-art/tweets.json      the pictures (concept-art/thumbs/, or the originals in images/ when present)
and the two films, Six Facts at the start of the loop and Further at the end.

The loop opens with the Highlights, a fast reel built like the opening of Further: highlights.json picks the shots,
this build fills them from the same sources, and wall/media holds the NASA clips it plays (cut by clips.py).

chapters.json sorts everything into six chapters by theme. The build stops if anything lands in no chapter or in two.
Writes dist/big-wall.html (opens from the folder or the website) and dist/manifest.json (the chapters and their
lengths for the front page, and the files the page loads, which hub/site.py copies to the website).

    python3 -I wall/build.py
"""
import base64, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / "dist"
UP = "../../"  # from wall/dist/ to the repo root
# The timeline every wall shares (drag, click or scroll through the loop), inlined so the page works from a folder
TIMELINE = ROOT / "vibes" / "timeline.js"

# Seconds on screen. Text slides use the same reading times as their own walls.
CARD, FACT, FURTHER, PICTURE = 6, 10, 9, 6
FILMS = {
    "sixfacts": {"title": "Six Facts", "sub": "the show reel", "sources": ["showreel/renders/six-facts-2050-1080p.mp4", "video/dist/media/six-facts-720p.mp4"], "sec": 149.5},
    "further": {"title": "Further", "sub": "the wall film", "sources": ["video/renders/further-2050-1080p.mp4", "video/dist/media/further-720p.mp4"], "sec": 75.0},
}


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf8"))


def words(s):
    return len(str(s).split())


def js_str(obj_src, key):
    m = re.search(r"(?:^|[,{\s])" + key + r":'([^']*)'", obj_src)
    return m.group(1) if m else None


def js_objects(tpl, start):
    """The top-level {...} items of the JS array that opens with `start` in books/template.html."""
    i = tpl.index(start) + len(start)
    end = tpl.index("\n];", i)
    body, out, depth, cur = tpl[i:end], [], 0, ""
    for ch in body:
        if ch == "{":
            depth += 1
        if depth:
            cur += ch
        if ch == "}":
            depth -= 1
            if depth == 0:
                out.append(cur)
                cur = ""
    return out


def books():
    tpl = (ROOT / "books/template.html").read_text(encoding="utf8")
    bk = {}
    for o in js_objects(tpl, "const B=["):
        bid = js_str(o, "id")
        pal = re.search(r"pal:\['(#[0-9A-Fa-f]{6})'", o)
        bk[bid] = {"t": js_str(o, "t"), "au": js_str(o, "au"), "y": int(re.search(r"y:(\d+)", o).group(1)), "c": pal.group(1) if pal else "#ff5315"}
    qx = tpl[tpl.index("const QX={"):tpl.index("};", tpl.index("const QX={"))]
    for m in re.finditer(r"(\w+):\{t:'([^']*)',au:'([^']*)',y:(\d+),pal:\['(#[0-9A-Fa-f]{6})'", qx):
        bk[m.group(1)] = {"t": m.group(2), "au": m.group(3), "y": int(m.group(4)), "c": m.group(5)}
    ideas = []
    for o in js_objects(tpl, "const I=["):
        sl = re.search(r"sl:\{t:'([^']*)'", o)
        ideas.append({"bl": js_str(o, "bl"), "h": js_str(o, "h"), "t": js_str(o, "t"), "src": js_str(o, "src"),
                      "b": re.findall(r"'(\w+)'", re.search(r"b:\[([^\]]*)\]", o).group(1)),
                      "st": js_str(o, "st"), "stt": js_str(o, "stt"), "sl": sl.group(1) if sl else None})
    return bk, ideas


def tweet_text(t):
    segs = t.get("wall") or [t["text"]]
    clean = []
    for s in segs:
        s = s.replace("[link]", " ")
        s = "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in s.split("\n"))
        clean.append(re.sub(r"\n{2,}", "\n", s).strip())
    return " … ".join(clean)


def spread(queues, first=()):
    """Merge lists so each kind is spread evenly through the chapter. Kinds in `first` open it."""
    pos = []
    for rank, (kind, items) in enumerate(queues):
        n = len(items)
        for i, it in enumerate(items):
            p = (i / n) if kind in first else (i + 0.5) / n
            pos.append((p, rank, it))
    return [it for _, _, it in sorted(pos, key=lambda x: (x[0], x[1]))]


def highlights(facts, further, quotes, bk, themes, ai_made, errors):
    """The opening reel: every shot from highlights.json, filled from its source, with its start time t."""
    cfg = load("wall/highlights.json")
    shot_src = {s["id"]: s["src"] for s in load("showreel/footage.json")["shots"]}
    sources = load("showreel/footage.json")["sources"]
    clips = {}
    for name, c in cfg["clips"].items():
        src = sources.get(shot_src.get(c["shot"]), {})
        clips[name] = {"src": f"wall/media/{name}.mp4", "poster": f"wall/media/{name}.jpg",
                       "credit": src.get("credit", "NASA").replace("NASA/", "NASA · ")}
        for f in (clips[name]["src"], clips[name]["poster"]):
            if not (ROOT / f).exists():
                errors.append(f"missing {f}: run python3 -I wall/clips.py")
    pics = {Path(p["thumb"]).stem: p for ps in themes.values() for p in ps}

    def pic(stem):
        if stem in ai_made:
            errors.append(f"highlights: picture {stem!r} is AI-made; the wall shows people's work only")
            return None
        if stem not in pics:
            errors.append(f"highlights: no picture {stem!r} in concept-art/tweets.json")
            return None
        p = pics[stem]
        return {"thumb": p["thumb"], "file": p["file"], "artist": p["artist"], "handle": p["handle"]}

    shots = []
    for sh in cfg["shots"]:
        k = sh["k"]
        if k == "title":
            shots.append(dict(sh))
        elif k == "further":
            f = further.get(sh["key"])
            if not f:
                errors.append(f"highlights: no Further slide {sh['key']!r}")
                continue
            # one read of the claim: about a third of a second a word, never under 1.7 s
            shots.append({"k": k, "key": f["key"], "hero": f["hero"], "year": f.get("year") or "", "film": f.get("film") or "",
                          "credit": f.get("credit") or "", "d": sh.get("d") or round(max(1.7, 0.9 + 0.32 * words(f["hero"])), 1)})
        elif k == "fact":
            f = facts.get(sh["id"])
            if not f:
                errors.append(f"highlights: no fact {sh['id']!r}")
                continue
            shots.append({"k": k, "num": f["num"], "count": f.get("count"), "line": sh["line"], "since": sh.get("since", ""),
                          "src": f["src"].split(",")[0],
                          "clip": sh.get("clip"), "d": sh["d"]})
        elif k == "clip":
            shots.append({"k": k, "clip": sh["clip"], "d": sh["d"]})
        elif k == "art":
            ps = [p for p in (pic(s) for s in sh["pics"]) if p]
            n = max(1, len(ps) - 1)
            for i, p in enumerate(ps):
                shots.append({"k": k, "pic": p, "d": round(sh["from"] + (sh["to"] - sh["from"]) * i / n, 2)})
        elif k == "quote":
            hit = [q for q in quotes if q["q"].startswith(sh["starts"])]
            if len(hit) != 1:
                errors.append(f"highlights: {len(hit)} quotes start with {sh['starts']!r}")
                continue
            q, b = hit[0], bk.get(hit[0]["b"], {})
            shots.append({"k": k, "q": q["q"], "by": q.get("by") or b.get("au", ""), "book": b.get("t", ""), "y": b.get("y", ""), "d": sh["d"]})
        elif k == "wall":
            # The wall itself: Further's photos and the reel's pictures, dealt so neighbours differ
            photos = [f"video/assets/photos/{key}.jpg" for key in further]
            art = [s["pic"]["thumb"] for s in shots if s["k"] == "art"] + [p["thumb"] for p in (pic(s) for s in sh["pics"]) if p]
            tiles, a, b = [], list(photos), list(art)
            while a or b:
                for src in (b, a, b):
                    if src:
                        tiles.append(src.pop(0))
            shots.append({"k": k, "tiles": tiles[:40], "d": sh["d"]})
        else:
            errors.append(f"highlights: unknown shot kind {k!r}")
    for s in shots:
        if s.get("clip") and s["clip"] not in clips:
            errors.append(f"highlights: no clip {s['clip']!r}")
    t = 0.0
    for s in shots:
        s["t"] = round(t, 2)
        t += s["d"]
    return {"shots": shots, "clips": clips, "total": round(t, 1)}


def main():
    cfg = load("wall/chapters.json")
    chapters = cfg["chapters"]
    ids = [c["id"] for c in chapters]
    errors = []

    # --- the six pieces ---
    reel = load("showreel/reel.json")
    facts = {c["id"]: c["fact"] for c in reel["chapters"]}
    slides = load("video/slides.json")
    further = {s["key"]: s for ch in slides["chapters"] for s in ch["slides"]}
    bk, ideas = books()
    quotes = load("books/quotes.json")
    tw = load("tweets/tweets.json")
    topic_block = {t["id"]: t["block"] for t in tw["topics"]}
    art = load("concept-art/tweets.json")

    # --- sort into chapters ---
    def once(kind, names, universe):
        seen = {}
        for c in chapters:
            for n in c[names]:
                if n not in universe:
                    errors.append(f"{c['id']}: unknown {kind} {n!r}")
                if n in seen:
                    errors.append(f"{kind} {n!r} is in {seen[n]} and {c['id']}")
                seen[n] = c["id"]
        for n in universe:
            if n not in seen:
                errors.append(f"{kind} {n!r} is in no chapter")
    once("fact", "facts", facts)
    once("Further slide", "further", further)

    def quote_chapter(q):
        hits = [ch for pre, ch in cfg["quote_overrides"].items() if q["q"].startswith(pre)]
        return hits[0] if hits else cfg["books"].get(q["b"])
    for pre in cfg["quote_overrides"]:
        n = sum(q["q"].startswith(pre) for q in quotes)
        if n != 1:
            errors.append(f"quote override {pre!r} matches {n} quotes")
    for h in cfg["idea_overrides"]:
        if not any(i["h"] == h for i in ideas):
            errors.append(f"idea override {h!r} matches no idea")
    block_of_idea = {}
    for c in chapters:
        for b in c["idea_blocks"]:
            block_of_idea[b] = c["id"]
    block_of_tweet = {}
    for c in chapters:
        for b in c["tweet_blocks"]:
            block_of_tweet[b] = c["id"]

    by = {c["id"]: {"facts": [], "further": [], "quotes": [], "ideas": [], "tweets": []} for c in chapters}
    for c in chapters:
        by[c["id"]]["facts"] = [dict(facts[k], id=k) for k in c["facts"] if k in facts]
        by[c["id"]]["further"] = [further[k] for k in c["further"] if k in further]
    for n, q in enumerate(quotes):
        ch = quote_chapter(q)
        b = bk.get(q["b"])
        if ch not in by or not b:
            errors.append(f"quote {n + 1} ({q['b']}): no chapter or no book")
            continue
        by[ch]["quotes"].append({"q": q["q"], "by": q.get("by") or b["au"], "book": b["t"], "y": b["y"], "c": b["c"]})
    for i in ideas:
        ch = cfg["idea_overrides"].get(i["h"]) or block_of_idea.get(i["bl"])
        if ch not in by:
            errors.append(f"idea {i['h']!r}: no chapter")
            continue
        src = i["src"] or " and ".join(f"{bk[x]['t']} · {bk[x]['au'].split(',')[0]}, {bk[x]['y']}" for x in i["b"] if x in bk)
        by[ch]["ideas"].append({"h": i["h"], "t": i["t"], "src": src, "st": i["st"], "stt": i["stt"], "c": bk[i["b"][0]]["c"] if i["b"] and i["b"][0] in bk else None})
    authors = tw["authors"]
    avatars = {}
    for c in chapters:
        # Within a block: research topics first, then by date; never the same face twice in a row when another is left.
        rank = {t["id"]: n for n, t in enumerate(tw["topics"])}
        pool = sorted([t for t in tw["tweets"] if block_of_tweet.get(topic_block.get(t["topic"])) == c["id"]],
                      key=lambda t: (rank[t["topic"]], t["iso"]))
        out, prev = [], ""
        while pool:
            i = next((k for k, t in enumerate(pool) if t["h"] != prev), 0)
            t = pool.pop(i)
            out.append(t)
            prev = t["h"]
        for t in out:
            a = authors.get(t["h"], {})
            if t["h"] not in avatars:
                p = ROOT / "tweets/avatars" / (t["h"] + ".jpg")
                avatars[t["h"]] = "data:image/jpeg;base64," + base64.b64encode(p.read_bytes()).decode() if p.exists() else ""
            by[c["id"]]["tweets"].append({"text": tweet_text(t), "h": t["h"], "name": a.get("name") or t["h"], "role": a.get("role", ""), "date": t["date"]})
    for t in tw["tweets"]:
        if topic_block.get(t["topic"]) not in block_of_tweet:
            errors.append(f"tweet {t['id']}: its block {topic_block.get(t['topic'])!r} is in no chapter")

    # --- pictures, by theme. The page deals them out in turn, so each loop shows the next ones. ---
    # Pictures marked as AI-made in concept-art/picks.json stay on the Imagined Futures wall but not on this one.
    themes, ai_made = {}, {Path(ph["thumb"]).stem for p in art if p.get("ai") for ph in p["photos"]}
    for p in art:
        if p.get("ai"):
            continue
        for n, ph in enumerate(p["photos"]):
            themes.setdefault(p["theme"], []).append({
                "thumb": "concept-art/" + ph["thumb"], "file": "concept-art/" + ph["file"], "w": ph["w"], "h": ph["h"],
                "desc": p.get("desc") or "", "artist": p.get("artist") or p.get("name") or p["handle"], "handle": p["handle"],
                "year": (p.get("date") or "")[:4]})
    wanted = {t for c in chapters for t in c["art"]}
    for t in themes:
        if t not in wanted:
            errors.append(f"picture theme {t!r} is in no chapter")
    reel = highlights(facts, further, quotes, bk, themes, ai_made, errors)
    if errors:
        print("\n".join(errors))
        sys.exit(1)

    # --- the loop ---
    def dur(it):
        k = it["k"]
        if k == "quote":
            return max(8, 3 + 0.34 * words(it["q"]))
        if k == "idea":
            # the idea wall's reading time, plus the line on what exists today
            return max(8, 2.3 + 0.3 * words(it["h"] + " " + it["t"]) + 0.2 * words(it.get("stt") or ""))
        if k == "tweet":
            return max(7, min(22, 3 + 0.3 * words(it["text"])))
        return {"fact": FACT, "further": FURTHER + further_hold(it), "pic": PICTURE, "card": CARD, "reel": reel["total"]}[k]

    def further_hold(it):
        return float(it.get("hold") or 0)

    loop, summary = [], []
    counts = {"facts": len(facts), "further": len(further), "quotes": len(quotes), "ideas": len(ideas),
              "tweets": len(tw["tweets"]), "pictures": sum(len(v) for v in themes.values())}
    loop.append({"k": "reel"})
    loop.append({"k": "film", "film": "sixfacts"})
    for n, c in enumerate(chapters):
        b = by[c["id"]]
        mix = spread([("fact", [dict(x, k="fact") for x in b["facts"]]),
                      ("further", [dict(x, k="further") for x in b["further"]]),
                      ("quote", [dict(x, k="quote") for x in b["quotes"]]),
                      ("tweet", [dict(x, k="tweet") for x in b["tweets"]]),
                      ("idea", [dict(x, k="idea") for x in b["ideas"]])], first=("fact",))
        if c["id"] == "finale":
            # The finale ends on Further's last slide, Earth seen from Saturn
            mix.sort(key=lambda it: it["k"] == "further")
        # A picture after every two text slides; a Further slide is a picture already. A chapter with
        # "pictures": "dense" (Beyond, where most of the concept art is) gets one after every slide.
        items, run, dense = [], 0, c.get("pictures") == "dense"
        for it in mix:
            items.append(it)
            run = 0 if it["k"] == "further" and not dense else run + 1
            if run == (1 if dense else 2):
                items.append({"k": "pic"})
                run = 0
        card = {"k": "card", "n": n + 1, "of": len(chapters), "id": c["id"], "title": c["title"], "sub": c["sub"],
                "has": {k: len(v) for k, v in b.items() if v}}
        chapter = [card] + items
        for it in chapter:
            it["ch"] = c["id"]
        secs = sum(dur(it) for it in chapter)
        card["sec"] = round(secs)
        summary.append({"id": c["id"], "title": c["title"], "sub": c["sub"], "color": c["color"], "sec": round(secs),
                        "slides": len(chapter), "has": card["has"], "pictures": sum(1 for it in items if it["k"] == "pic")})
        loop += chapter
    loop.append({"k": "film", "film": "further", "ch": "finale"})
    for it in loop:
        if it["k"] != "film":
            it["d"] = round(dur(it), 1)

    # Files the page loads, relative to the repo root (hub/site.py copies them to the website)
    files = sorted({f"video/assets/photos/{k}.jpg" for k in further} | {s for f in FILMS.values() for s in f["sources"]}
                   | {f for c in reel["clips"].values() for f in (c["src"], c["poster"])})
    for k in further:
        if not (ROOT / f"video/assets/photos/{k}.jpg").exists():
            sys.exit(f"missing video/assets/photos/{k}.jpg")
    total = sum(it.get("d", 0) for it in loop) + sum(f["sec"] for f in FILMS.values())
    data = {"up": UP, "loop": loop, "chapters": [dict(s, **{"color": c["color"]}) for s, c in zip(summary, chapters)],
            "films": FILMS, "themes": themes, "art": {c["id"]: c["art"] for c in chapters}, "avatars": avatars,
            "counts": counts, "total": round(total), "reel": reel}
    tpl = (HERE / "template.html").read_text(encoding="utf8")
    slot = "const D=/*DATA*/{};"
    if slot not in tpl:
        sys.exit("template.html is missing the const D=/*DATA*/{}; slot")
    if tpl.count("/*WALL_TIMELINE*/") != 1:
        sys.exit("template.html needs exactly one /*WALL_TIMELINE*/ slot")
    tpl = tpl.replace("/*WALL_TIMELINE*/", TIMELINE.read_text(encoding="utf8"), 1)
    page = tpl.replace(slot, "const D=/*DATA*/" + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + ";", 1)
    OUT.mkdir(exist_ok=True)
    (OUT / "big-wall.html").write_text(page, encoding="utf8")
    manifest = {"page": "wall/dist/big-wall.html", "total": round(total), "slides": len(loop), "counts": counts,
                "highlights": {"sec": round(reel["total"]), "shots": len(reel["shots"])},
                "chapters": summary, "files": [f for f in files if "/renders/" not in f]}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    m, s = divmod(round(total), 60)
    print(f"big-wall.html: highlights {reel['total']} s in {len(reel['shots'])} shots, then {len(loop)} slides in {len(chapters)} chapters, {m} min {s:02d} s a loop; "
          + ", ".join(f"{c['title']} {c['sec'] // 60}:{c['sec'] % 60:02d}" for c in summary)
          + f"; {counts['pictures']} pictures ({len(ai_made)} AI-made left out) dealt {sum(c['pictures'] for c in summary)} a loop")


if __name__ == "__main__":
    main()
