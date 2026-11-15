"""Download the picked Commons files at 2560 px and crop them to 2304 x 1296 (16:9).

picks.json: {"<key>": {"title": "File:...", "focus": [fx, fy]}}, focus in 0..1 says
where the crop centres (0.5, 0.5 is the middle). One batched API call for the
2560 px URLs and licence data, then one paced download per file. Writes
assets/photos/<key>.jpg and assets/photos/credits.json.
"""
import json, os, subprocess, time, urllib.parse, urllib.request, html, re

UA = "future-party-video/1.0 (private non-commercial party loop; generic client)"
API = "https://commons.wikimedia.org/w/api.php"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
OUT = os.path.join(ROOT, "assets", "photos")
W, H = 2304, 1296
last = [0.0]


def get(url, binary=False):
    wait = 3.0 - (time.time() - last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
    finally:
        last[0] = time.time()
    return data if binary else json.loads(data)


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def main():
    SET = os.environ.get("SET", "")
    picks = json.load(open(os.path.join(ROOT, "assets", "picks" + ("-" + SET if SET else "") + ".json")))
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    titles = [p["title"] for p in picks.values()]
    info = {}
    for i in range(0, len(titles), 40):
        params = {"action": "query", "format": "json", "titles": "|".join(titles[i:i + 40]),
                  "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": "2560",
                  "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired"}
        d = get(API + "?" + urllib.parse.urlencode(params))
        norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
        for p in d["query"]["pages"].values():
            info[norm.get(p["title"], p["title"])] = p
    cpath = os.path.join(OUT, "credits.json")
    credits = json.load(open(cpath)) if os.path.exists(cpath) else {}  # merge: v1 and v2 keys live side by side
    for key, pick in picks.items():
        p = info.get(pick["title"])
        if not p or "imageinfo" not in p:
            print(key, "NOT FOUND", pick["title"])
            continue
        ii = p["imageinfo"][0]
        md = ii.get("extmetadata", {})
        src = ii.get("thumburl") or ii["url"]
        raw = os.path.join(RAW, key + os.path.splitext(urllib.parse.urlparse(src).path)[1].lower())
        if not os.path.exists(raw):
            open(raw, "wb").write(get(src, binary=True))
        fx, fy = pick.get("focus", [0.5, 0.5])
        # scale to cover 2304x1296, then crop around the focus point
        if pick.get("fit") == "contain":  # space objects on black: keep the whole object
            vf = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
                  f"pad={W}:{H}:(ow-iw)/2:(oh-ih)*{fy}:black")
        else:
            z = float(pick.get("zoom", 1))  # >1 crops tighter around the focus (a small subject on black)
            vf = (f"scale={round(W * z)}:{round(H * z)}:force_original_aspect_ratio=increase,"
                  f"crop={W}:{H}:(iw-{W})*{fx}:(ih-{H})*{fy}")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-vf", vf, "-q:v", "2",
                        os.path.join(OUT, key + ".jpg")], check=True)
        credits[key] = {"title": pick["title"], "page": ii.get("descriptionurl"),
                        "license": clean(md.get("LicenseShortName", {}).get("value")),
                        "license_url": clean(md.get("LicenseUrl", {}).get("value")),
                        "artist": clean(md.get("Artist", {}).get("value"))[:160],
                        "credit": clean(md.get("Credit", {}).get("value"))[:160],
                        "attribution_required": clean(md.get("AttributionRequired", {}).get("value"))}
        print(f"{key:12s} ok  {credits[key]['license']:<14s} {credits[key]['artist'][:60]}", flush=True)
    json.dump(credits, open(cpath, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
