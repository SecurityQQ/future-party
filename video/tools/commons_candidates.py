"""Find landscape photo candidates on Wikimedia Commons for each subject.

One API call per subject, then 480 px thumbnails for up to 5 landscape candidates
(original at least 1600 px wide). Paced 3 s per request, as the find-references
guide paces Commons. Writes candidates.json and thumbnails under assets/candidates/.
"""
import json, os, sys, time, urllib.parse, urllib.request, html, re

UA = "future-party-video/1.0 (private non-commercial party loop; generic client)"
API = "https://commons.wikimedia.org/w/api.php"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SET = os.environ.get("SET", "")  # "v2" reads tools/subjects_v2.json and writes candidates-v2*
OUT = os.path.join(ROOT, "assets", "candidates" + ("-" + SET if SET else ""))

SUBJECTS = [
 # chapter, key, query
 ("city", "supertrees", "Supertree Grove Gardens by the Bay"),
 ("city", "bosco", "Bosco Verticale"),
 ("city", "skywalk", "Lujiazui skyline"),
 ("city", "solar", "Noor Ouarzazate solar"),
 ("city", "maglev", "Shanghai Maglev Train"),
 ("city", "waymo", "Waymo Jaguar I-PACE"),
 ("city", "barrier", "Thames Barrier"),
 ("city", "eden", "Eden Project biomes"),
 ("city", "wind", "offshore wind farm aerial"),
 ("machines", "sophia", "Sophia robot AI for Good"),
 ("machines", "valkyrie", "Robonaut 2 International Space Station"),
 ("machines", "headset", "Apple Vision Pro"),
 ("machines", "frontier", "Frontier supercomputer Oak Ridge"),
 ("machines", "sequencer", "DNA sequencer laboratory"),
 ("machines", "vfarm", "vertical farm"),
 ("machines", "ingenuity", "Ingenuity helicopter Mars"),
 ("space", "launch", "Artemis I launch Space Launch System"),
 ("space", "iss", "International Space Station from Crew Dragon"),
 ("space", "veggie", "Veggie plant growth red romaine lettuce ISS"),
 ("space", "perseverance", "Perseverance rover selfie"),
 ("space", "torus", "Stanford torus interior NASA Ames"),
 ("space", "saturn", "Saturn Cassini equinox"),
 ("space", "blackhole", "Event Horizon Telescope M87 black hole"),
 ("space", "cliffs", "Cosmic Cliffs Carina Webb"),
 ("space", "orion", "Orion spacecraft Earth Moon Artemis I"),
 ("space", "earthrise", "Earthrise Apollo 8"),
]

last = [0.0]


def get(url, binary=False):
    wait = 3.0 - (time.time() - last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    finally:
        last[0] = time.time()
    return data if binary else json.loads(data)


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def main(only=None):
    global SUBJECTS
    if SET:
        SUBJECTS = [tuple(x) for x in json.load(open(os.path.join(ROOT, "tools", f"subjects_{SET}.json")))]
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(ROOT, "assets", "candidates" + ("-" + SET if SET else "") + ".json")
    result = json.load(open(path)) if os.path.exists(path) else {}
    for chap, key, q in SUBJECTS:
        if only and key not in only:
            continue
        params = {"action": "query", "format": "json", "generator": "search",
                  "gsrsearch": q + " filetype:bitmap", "gsrnamespace": "6", "gsrlimit": "20",
                  "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "480",
                  "iiextmetadatafilter": "LicenseShortName|Artist|Credit|ObjectName|DateTimeOriginal"}
        try:
            d = get(API + "?" + urllib.parse.urlencode(params))
        except Exception as e:
            print(key, "search failed", e)
            continue
        pages = sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
        keep = []
        for p in pages:
            ii = (p.get("imageinfo") or [{}])[0]
            w, h = ii.get("width", 0), ii.get("height", 0)
            if w < 1600 or h == 0 or w / h < 1.2 or ii.get("mime") not in ("image/jpeg", "image/png", "image/tiff"):
                continue
            md = ii.get("extmetadata", {})
            keep.append({"title": p["title"], "w": w, "h": h, "url": ii.get("url"), "thumb": ii.get("thumburl"),
                         "page": ii.get("descriptionurl"),
                         "license": clean(md.get("LicenseShortName", {}).get("value")),
                         "artist": clean(md.get("Artist", {}).get("value"))[:120],
                         "credit": clean(md.get("Credit", {}).get("value"))[:120],
                         "date": clean(md.get("DateTimeOriginal", {}).get("value"))[:20]})
            if len(keep) == 5:
                break
        os.makedirs(os.path.join(OUT, key), exist_ok=True)
        for i, c in enumerate(keep):
            try:
                open(os.path.join(OUT, key, f"{i}.jpg"), "wb").write(get(c["thumb"], binary=True))
            except Exception as e:
                c["thumb_error"] = str(e)[:80]
        result[key] = {"chapter": chap, "query": q, "found": len(pages), "candidates": keep}
        print(f"{key:12s} found {len(pages):2d}, kept {len(keep)}", flush=True)
        json.dump(result, open(path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
