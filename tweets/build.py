"""Build 2050 in 78 Tweets: the tweet list and its wall projection.

tweets.json is the source. It holds blocks (the five wall blocks, in play order), topics (each
with its block), types, authors (handle key -> h, name, role, core, followers) and tweets.
Each tweet has id, h, group (core = the 12 futurists of the main page, more = the follow-up
search), topic, type, text (verbatim from the X API, links as [link]), replyTo, date, iso,
likes, views, note, and optionally wall: verbatim excerpts that a long tweet shows on the wall.
avatars/<handle>.jpg are the profile pictures (256 px), embedded as data URIs.

Run: python3 -I build.py
Writes dist/tweets-2050.html (publish to the artifact) and dist/tweet-wall.html
(a standalone copy that opens in any browser, for the projector), both in the website's Blue futurism
(vibes/restyle.py).
"""
import base64, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# The timeline every wall shares (drag, click or scroll through the loop), inlined so the page works from a folder
TIMELINE = HERE.parent / "vibes" / "timeline.js"
MAX_WALL_WORDS = 70  # longer tweets must carry a wall excerpt


def blue(path):
    """Dress a written page in the website's Blue futurism (vibes/restyle.py), like every other page of the site."""
    import importlib.util
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("vibes_restyle", Path(__file__).resolve().parents[1] / "vibes" / "restyle.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.restyle_file(path)


def words(s):
    return len(s.replace("[link]", " ").split())


def check(W):
    errors = []
    blocks = {b["id"] for b in W["blocks"]}
    topics = {t["id"]: t for t in W["topics"]}
    for t in W["topics"]:
        if t.get("block") not in blocks: errors.append(f"topic {t['title']}: unknown block {t.get('block')!r}")
    ids = [t["id"] for t in W["tweets"]]
    if len(ids) != len(set(ids)): errors.append("duplicate tweet ids")
    for t in W["tweets"]:
        tag = f"tweet {t['id']}"
        if t["h"] not in W["authors"]: errors.append(f"{tag}: unknown author {t['h']}")
        elif not (HERE / "avatars" / (t["h"] + ".jpg")).exists(): errors.append(f"{tag}: no avatars/{t['h']}.jpg")
        if t["topic"] not in topics: errors.append(f"{tag}: unknown topic")
        if t["type"] not in W["types"]: errors.append(f"{tag}: unknown type")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", t.get("iso", "")): errors.append(f"{tag}: bad iso date")
        ex = t.get("wall")
        if ex:
            pos = 0
            for seg in ex:
                i = t["text"].find(seg, pos)
                if i < 0: errors.append(f"{tag}: wall excerpt is not verbatim or out of order: {seg[:50]!r}")
                else: pos = i + len(seg)
            if not any("2050" in seg for seg in ex) and "2050" in t["text"]: errors.append(f"{tag}: wall excerpt drops 2050")
        elif words(t["text"]) > MAX_WALL_WORDS:
            errors.append(f"{tag}: {words(t['text'])} words, needs a wall excerpt")
    return errors


def main():
    W = json.loads((HERE / "tweets.json").read_text(encoding="utf8"))
    errors = check(W)
    if errors:
        print("\n".join(errors)); sys.exit(1)
    for k, a in W["authors"].items():
        a["img"] = "data:image/jpeg;base64," + base64.b64encode((HERE / "avatars" / (k + ".jpg")).read_bytes()).decode()
    W["authors"] = {k: a for k, a in W["authors"].items() if any(t["h"] == k for t in W["tweets"])}
    tpl = (HERE / "template.html").read_text(encoding="utf8")
    if tpl.count("/*WALL*/null") != 1:
        print("template.html needs exactly one /*WALL*/null slot"); sys.exit(1)
    if tpl.count("/*WALL_TIMELINE*/") != 1:
        print("template.html needs exactly one /*WALL_TIMELINE*/ slot"); sys.exit(1)
    tpl = tpl.replace("/*WALL_TIMELINE*/", TIMELINE.read_text(encoding="utf8"), 1)
    page = tpl.replace("/*WALL*/null", json.dumps(W, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"), 1)
    out = HERE / "dist"; out.mkdir(exist_ok=True)
    (out / "tweets-2050.html").write_text(page, encoding="utf8")
    shell = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
             '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n')
    (out / "tweet-wall.html").write_text(shell + page + "\n</html>\n", encoding="utf8")
    blue(out / "tweets-2050.html"); blue(out / "tweet-wall.html")
    n = len(W["tweets"])
    print(f"{n} tweets, {len(W['authors'])} authors, {sum(1 for t in W['tweets'] if t.get('wall'))} wall excerpts, "
          f"{len(page) // 1024} KB -> dist/")


if __name__ == "__main__":
    main()
