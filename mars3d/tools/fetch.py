"""Download the originals behind Mars in 3D into mars3d/raw/ (not committed).

    python3 -I mars3d/tools/fetch.py

NASA pictures come from the NASA Image and Video Library (images.nasa.gov), ESA pictures from
Wikimedia Commons (ESA's own uploads, CC BY-SA 3.0 IGO). The globe uses the Viking colour mosaic
(USGS, public domain, via Commons) and the MOLA topography grid MEGT90N000CB (PDS Geosciences Node).
Files already in raw/ are kept. raw/meta.json keeps each source's own title, date, credit and text.
"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / "raw"
UA = {"User-Agent": "future-party-mars3d/1.0 (build script)"}

# ESA pictures on Wikimedia Commons, by the id slides.json uses
COMMONS = {
    "ESA211204": "File:Noctis Labyrinthus, anaglyph image ESA211204.jpg",
    "ESA228571": "File:3D anaglyph view of Juventae Chasma ESA228571.jpg",
    "ESA202923": "File:Aram Chaos, 3D anaglyph ESA202923.jpg",
    "ESA21793981": "File:Mars’ north polar ice cap in 3D ESA21793981.tiff",
    "ESA200429": "File:Mars 3D anaglyph (colour) ESA200429.jpg",
    "viking": "File:Mars Viking MDIM21 ClrMosaic 1km.jpg",
}
MOLA = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/megt90n000cb.img"


def get(url, tries=6):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except Exception as e:  # Commons answers 429 when asked too fast
            if i == tries - 1:
                raise
            print("  retry", url[:90], e)
            time.sleep(8 * (i + 1))


def nasa(pid, meta):
    info = json.loads(get(f"https://images-api.nasa.gov/search?nasa_id={pid}"))["collection"]["items"][0]["data"][0]
    files = json.loads(get(f"https://images-api.nasa.gov/asset/{pid}"))["collection"]["items"]
    orig = next(x["href"] for x in files if "~orig." in x["href"]).replace("http://", "https://").replace(" ", "%20")
    ext = orig.rsplit(".", 1)[1].lower()
    out = RAW / f"{pid}.{ext}"
    if not out.exists():
        out.write_bytes(get(orig))
    meta[pid] = {"file": out.name, "source": f"https://images.nasa.gov/details/{pid}", "download": orig,
                 "title": info.get("title"), "date": info.get("date_created", "")[:10],
                 "credit": info.get("secondary_creator") or "NASA/JPL", "licence": "Public domain (NASA)",
                 "text": info.get("description", "")}


def commons(key, meta, width=4000):
    q = urllib.parse.urlencode({"action": "query", "titles": COMMONS[key], "prop": "imageinfo", "format": "json",
                                "iiprop": "url|size|extmetadata", "iiurlwidth": width,
                                "iiextmetadatafilter": "LicenseShortName|Artist|ImageDescription|DateTimeOriginal"})
    page = next(iter(json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))["query"]["pages"].values()))
    ii = page["imageinfo"][0]
    out = RAW / f"{key}.jpg"
    if not out.exists():
        out.write_bytes(get(ii.get("thumburl") or ii["url"]))
    em = ii.get("extmetadata", {})
    v = lambda k: (em.get(k) or {}).get("value", "")
    meta[key] = {"file": out.name, "source": ii["descriptionurl"], "download": ii.get("thumburl") or ii["url"],
                 "title": page["title"], "date": v("DateTimeOriginal"), "credit": v("Artist"),
                 "licence": v("LicenseShortName"), "text": v("ImageDescription")}
    time.sleep(2)


def main():
    RAW.mkdir(exist_ok=True)
    slides = json.loads((HERE / "slides.json").read_text(encoding="utf8"))
    mp = RAW / "meta.json"
    meta = json.loads(mp.read_text()) if mp.exists() else {}
    for ch in slides["chapters"]:
        for s in ch["slides"]:
            if s["id"] in meta and (RAW / meta[s["id"]]["file"]).exists():
                continue
            print("fetch", s["id"])
            (commons if s["id"] in COMMONS else nasa)(s["id"], meta)
            mp.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    if "viking" not in meta:
        print("fetch the Viking colour mosaic")
        commons("viking", meta, width=4096)
    if not (RAW / "megt90n000cb.img").exists():
        print("fetch the MOLA topography grid")
        (RAW / "megt90n000cb.img").write_bytes(get(MOLA))
    meta["mola"] = {"file": "megt90n000cb.img", "source": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
                    "download": MOLA, "title": "MOLA Mission Experiment Gridded Data Record, 4 pixels per degree",
                    "credit": "NASA/GSFC MOLA Science Team", "licence": "Public domain (NASA)", "date": "2003", "text": ""}
    mp.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    print(len(meta), "sources in", RAW)


if __name__ == "__main__":
    main()
