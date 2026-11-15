"""Fetch the concept-art tweets: verbatim text, author and the original photos.

picks.json is the source: the curated tweet ids with their theme, era, ai flag, a short
description and the credited artist. For each pick this script asks the public fxtwitter
mirror (api.fxtwitter.com, no login) for the tweet, takes its photos at original size from
pbs.twimg.com, and writes tweets.json, the list the gallery is built from.

When a pick is a quote tweet without photos of its own, the quoted tweet is the original
post that carries the art, so the record points at it.

Run: python3 -I fetch.py            # fetches what is missing, reuses .cache/ and images/
     python3 -I fetch.py --refresh  # asks the mirror again for every tweet

Writes images/<tweet id>-<n>.<ext> (original size; re-fetchable, not committed),
thumbs/<tweet id>-<n>.jpg (720 px, committed), tweets.json and curation.json (the review in numbers).
"""
import json, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache" / "fx"
IMAGES = HERE / "images"
THUMBS = HERE / "thumbs"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) concept-art-fetch/1.0"}
THUMB_PX = 720


def get(url, tries=3):
    for n in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (404, 401, 403):
                raise
            time.sleep(2 + 3 * n)
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 + 3 * n)
    raise RuntimeError(f"gave up on {url}")


def fx(tweet_id, refresh):
    path = CACHE / f"{tweet_id}.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf8"))
    try:
        data = json.loads(get(f"https://api.fxtwitter.com/status/{tweet_id}"))
    except urllib.error.HTTPError as e:
        data = {"code": e.code, "message": str(e)}
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf8")
    return data


def photos_of(t):
    return [m for m in ((t.get("media") or {}).get("photos") or []) if m.get("type", "photo") == "photo"]


def iso(t):
    ts = t.get("created_timestamp")
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d") if ts else ""


def record(pick, data):
    if data.get("code") != 200 or not data.get("tweet"):
        return None, f"{pick['id']}: mirror says {data.get('code')} {data.get('message', '')}".strip()
    t = data["tweet"]
    via = None
    if not photos_of(t) and t.get("quote") and photos_of(t["quote"]):
        via = {"id": t["id"], "url": t["url"], "handle": t["author"]["screen_name"]}
        t = t["quote"]
    photos = photos_of(t)
    if not photos:
        return None, f"{pick['id']}: no photos (video or text only)"
    drop = set(pick.get("drop_photos", []))
    a = t["author"]
    rec = {
        "id": t["id"],
        "url": f"https://x.com/{a['screen_name']}/status/{t['id']}",
        "handle": a["screen_name"],
        "name": a.get("name", ""),
        "date": iso(t),
        "text": t.get("text", ""),
        "likes": t.get("likes", 0),
        "reposts": t.get("retweets", 0),
        "views": t.get("views"),
        "lang": t.get("lang"),
        "theme": pick["theme"],
        "era": pick["era"],
        "ai": bool(pick.get("ai")),
        "desc": pick.get("desc", ""),
        "artist": pick.get("artist"),
        "photos": [],
        "drop": bool(pick.get("drop")),
    }
    if via:
        rec["via"] = via
    for i, p in enumerate(photos, 1):
        src = p["url"].split("?")[0]
        ext = src.rsplit(".", 1)[-1].lower()
        rec["photos"].append({
            "src": src + "?name=orig",
            "w": p.get("width"), "h": p.get("height"),
            "file": f"images/{t['id']}-{i}.{ext}",
            "thumb": f"thumbs/{t['id']}-{i}.jpg",
            "drop": i in drop,
        })
    return rec, None


DUP_BITS = 12  # dHash distance (of 144 bits) under which two photos are the same picture (other scans and crops reach 12)


def dhash(path, n=12):
    with Image.open(path) as im:
        px = im.convert("L").resize((n + 1, n)).tobytes()
    bits = 0
    for r in range(n):
        for c in range(n):
            bits = (bits << 1) | (px[r * (n + 1) + c] > px[r * (n + 1) + c + 1])
    return bits


def download(photo):
    out = HERE / photo["file"]
    if not out.exists() or out.stat().st_size == 0:
        out.write_bytes(get(photo["src"]))
    th = HERE / photo["thumb"]
    if not th.exists():
        with Image.open(out) as im:
            im = im.convert("RGB")
            im.thumbnail((THUMB_PX, THUMB_PX), Image.LANCZOS)
            im.save(th, "JPEG", quality=82, optimize=True, progressive=True)
    return photo


def main():
    refresh = "--refresh" in sys.argv
    for d in (CACHE, IMAGES, THUMBS):
        d.mkdir(parents=True, exist_ok=True)
    picks = json.loads((HERE / "picks.json").read_text(encoding="utf8"))["picks"]
    ids = [p["id"] for p in picks]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        print("duplicate ids in picks.json:", ", ".join(sorted(dupes))); sys.exit(1)

    with ThreadPoolExecutor(4) as ex:
        datas = list(ex.map(lambda p: fx(p["id"], refresh), picks))

    records, problems, seen = [], [], set()
    for pick, data in zip(picks, datas):
        rec, err = record(pick, data)
        if not rec:
            problems.append(err); continue
        if rec["id"] in seen:
            problems.append(f"{pick['id']}: same original post as an earlier pick ({rec['id']})"); continue
        seen.add(rec["id"]); records.append(rec)

    photos = [p for r in records for p in r["photos"]]
    failed = []
    def safe(p):
        try:
            return download(p)
        except Exception as e:  # keep going; report below
            failed.append(f"{p['src']}: {e}")
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(safe, photos))
    for r in records:
        r["photos"] = [p for p in r["photos"] if (HERE / p["thumb"]).exists()]
        for p in r["photos"]:
            if not p["w"]:
                with Image.open(HERE / p["file"]) as im:
                    p["w"], p["h"] = im.size

    # The same artwork is often reposted by curator accounts. Keep each picture once, on its
    # earliest post (the closest to the original); a later post keeps only what is new in it.
    # Pictures left out in review (drop, drop_photos) take part too, so their reposts stay out.
    # Pictures in the same post are never compared: there, close matches are design variants.
    kept, dups = [], 0
    for r in sorted(records, key=lambda r: int(r["id"])):
        fresh = []
        for p in r["photos"]:
            h = dhash(HERE / p["thumb"])
            if any(post != r["id"] and bin(h ^ k).count("1") <= DUP_BITS for post, k in kept):
                dups += not (r["drop"] or p["drop"]); continue
            kept.append((r["id"], h))
            if not (r["drop"] or p["drop"]):
                fresh.append(p)
        r["photos"] = fresh
    records = [r for r in records if r["photos"] and not r["drop"]]
    for r in records:
        del r["drop"]
        for p in r["photos"]:
            del p["drop"]

    used = {p["thumb"] for r in records for p in r["photos"]}
    for f in THUMBS.glob("*.jpg"):
        if f"thumbs/{f.name}" not in used:
            f.unlink()
    (HERE / "tweets.json").write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf8")
    curation = {  # the review in numbers, shown on the page
        "candidates": len(picks),
        "dropped_posts": sum(1 for p in picks if p.get("drop")),
        "dropped_photos": sum(len(p.get("drop_photos", [])) for p in picks if not p.get("drop")),
        "reposts": dups,
        "unavailable": len(problems),
    }
    (HERE / "curation.json").write_text(json.dumps(curation, indent=1), encoding="utf8")
    n_ph = sum(len(r["photos"]) for r in records)
    print(f"{len(records)} tweets, {n_ph} photos ({dups} reposted pictures left out) -> tweets.json, images/, thumbs/")
    for line in problems + failed:
        print("  skipped", line)


if __name__ == "__main__":
    main()
