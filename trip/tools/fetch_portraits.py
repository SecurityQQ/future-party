"""Download the innovators' portraits from Wikimedia Commons and write CREDITS.md.

Run: python3 -I trip/tools/fetch_portraits.py [--sheet out.jpg]
Reads ../innovators.json. For each person it asks Commons for the file's licence and author, downloads a 1200-pixel
copy into ../.cache/ (not committed), cuts the frame in "crop" (centre x, centre y and height as parts of the
original; the frame is 4:5) or the whole picture's middle, and writes ../portraits/<id>.jpg (640 x 800).
Only public-domain and Creative Commons files are accepted. --sheet also writes one picture with every portrait.
"""
import json, re, subprocess, sys, time, urllib.parse
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent
CACHE = HERE / ".cache"
OUT = HERE / "portraits"
W, H = 640, 800
UA = "future-party-trip/1.0 (https://vargafutureparty.com)"
API = "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=1200&titles=File:"
OK = re.compile(r"^(public domain|pd\b|cc0|cc by(-sa)? \d)", re.I)


def get(url):
    # curl, not urllib: it uses the system's certificates, which a python.org Python on macOS lacks
    return subprocess.run(["curl", "-sSfL", "--retry", "3", "--retry-delay", "5", "-A", UA, url],
                          check=True, capture_output=True).stdout


def text(meta, key):
    s = re.sub(r"<[^>]+>", "", meta.get(key, {}).get("value", ""))
    s = re.sub(r"\s+", " ", s.replace("&amp;", "&")).strip()
    half = len(s) // 2  # Commons repeats "Unknown author" in two languages' markup
    return s[:half] if s and s[:half] == s[half:] else s


def main():
    people = json.loads((HERE / "innovators.json").read_text(encoding="utf8"))["people"]
    CACHE.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    rows = []
    for p in people:
        info = next(iter(json.loads(get(API + urllib.parse.quote(p["file"])))["query"]["pages"].values()))["imageinfo"][0]
        meta = info["extmetadata"]
        licence = text(meta, "LicenseShortName")
        if not OK.match(licence):
            sys.exit(f"{p['id']}: licence {licence!r} is not public domain or Creative Commons")
        raw = CACHE / (p["id"] + Path(urllib.parse.urlparse(info["thumburl"]).path).suffix)
        if not raw.exists():
            raw.write_bytes(get(info["thumburl"]))
            time.sleep(1)
        im = Image.open(raw).convert("RGB")
        cx, cy, h = p.get("crop", [0.5, 0.5, 0])
        ch = (h or min(1, im.width / im.height * H / W)) * im.height
        cw = ch * W / H
        x0 = min(max(cx * im.width - cw / 2, 0), im.width - cw)
        y0 = min(max(cy * im.height - ch / 2, 0), im.height - ch)
        im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.LANCZOS)
        im.save(OUT / (p["id"] + ".jpg"), "JPEG", quality=84, optimize=True, progressive=True)
        rows.append((p, licence, text(meta, "Artist") or "unknown", info["descriptionurl"], im))
        print(f"{p['id']:14} {licence:16} {rows[-1][2][:60]}")
    lines = ["# Trip 2050: credits", "",
             "## Portraits", "",
             "From Wikimedia Commons, cut to 4:5 and scaled down. The page recolours them as it plays.", "",
             "| Who | Portrait by | Licence |", "| --- | --- | --- |"]
    for p, licence, artist, page, _ in rows:
        lines.append(f"| [{p['name']}]({page}) | {artist.replace('|', '/')} | {licence} |")
    lines += ["", (HERE / "tools" / "credits_tail.md").read_text(encoding="utf8").strip(), ""]
    (HERE / "CREDITS.md").write_text("\n".join(lines), encoding="utf8")
    if "--sheet" in sys.argv:
        cols = 8
        sheet = Image.new("RGB", (cols * 240, -(-len(rows) // cols) * 300), "black")
        for i, r in enumerate(rows):
            sheet.paste(r[4].resize((240, 300)), (i % cols * 240, i // cols * 300))
        sheet.save(sys.argv[sys.argv.index("--sheet") + 1], quality=85)
    print(f"{len(rows)} portraits, {sum(f.stat().st_size for f in OUT.glob('*.jpg')) / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
