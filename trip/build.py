"""Build the data Trip 2050 plays: data.js (the pictures and the innovators) and presets.js (the MilkDrop visuals).

Run: python3 -I trip/build.py
  data.js     every Imagined Futures picture (concept-art/tweets.json: the 720-pixel copy in concept-art/thumbs/, the
              large copy on X the page tries when online, the artist or the account that posted it) and the
              innovators (innovators.json; their portraits come from tools/fetch_portraits.py)
  presets.js  the visuals named in presets.json, copied out of the butterchurn-presets package (MIT). The package is
              downloaded from the npm registry into .cache/ (not committed) the first time.
index.html loads both as scripts, so the page needs no server to read them. Nothing else is generated.
"""
import io, json, subprocess, sys, tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PACK = "https://registry.npmjs.org/butterchurn-presets/-/butterchurn-presets-2.4.7.tgz"
CACHE = HERE / ".cache" / "butterchurn-presets-2.4.7.tgz"


def data():
    posts = json.loads((ROOT / "concept-art" / "tweets.json").read_text(encoding="utf8"))
    art = []
    for p in posts:
        for ph in p["photos"]:
            if not (ROOT / "concept-art" / ph["thumb"]).exists():
                sys.exit(f"no concept-art/{ph['thumb']}")
            art.append({"t": "../concept-art/" + ph["thumb"], "f": ph["src"].replace("name=orig", "name=large"),
                        "by": p.get("artist") or "", "h": p["handle"]})
    people = json.loads((HERE / "innovators.json").read_text(encoding="utf8"))["people"]
    out = []
    for p in people:
        if not (HERE / "portraits" / f"{p['id']}.jpg").exists():
            sys.exit(f"no portraits/{p['id']}.jpg: run tools/fetch_portraits.py")
        out.append({"name": p["name"], "year": p["year"], "line": p["line"], "img": f"portraits/{p['id']}.jpg"})
    (HERE / "data.js").write_text(
        "// Written by build.py from concept-art/tweets.json and innovators.json\nwindow.TRIP = "
        + json.dumps({"art": art, "people": out}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf8")
    return len(art), len(out)


def presets():
    want = json.loads((HERE / "presets.json").read_text(encoding="utf8"))["presets"]
    if not CACHE.exists():
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_bytes(subprocess.run(["curl", "-sSfL", PACK], check=True, capture_output=True).stdout)
    out = {}
    with tarfile.open(fileobj=io.BytesIO(CACHE.read_bytes())) as tar:
        for name, kind in want.items():
            try:
                f = tar.extractfile(f"package/presets/converted/{name}.json")
            except KeyError:
                sys.exit(f"no preset named {name!r} in the package")
            out[name] = {"kind": kind, "preset": json.load(f)}
    (HERE / "presets.js").write_text(
        "// Written by build.py: MilkDrop presets from butterchurn-presets 2.4.7 (MIT), each by the author in its name\n"
        "window.TRIP_PRESETS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf8")
    return len(out), (HERE / "presets.js").stat().st_size / 1024


if __name__ == "__main__":
    a, p = data()
    n, kb = presets()
    print(f"trip: {a} pictures, {p} innovators, {n} visuals ({kb:.0f} KB)")
