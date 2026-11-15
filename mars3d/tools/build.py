"""Build Mars in 3D from slides.json and the originals in raw/ (run tools/fetch.py first).

    python3 -I mars3d/tools/build.py

Writes:
  img/<id>.jpg       each picture, black mosaic edges cut away, sized for a 1080p projector
  globe/textures.js  the Viking colour map and the MOLA height map as data URIs (WebGL can read them from disk)
  slides.js          the show, for index.html
  CREDITS.md         every picture with its source, credit and licence
  preview.jpg        the tile the front page shows

Anaglyphs keep their depth in the difference between the red and the cyan channels, so every JPEG is saved
without chroma subsampling (4:4:4): the usual 4:2:0 smears the two channels into each other and ghosts.
"""
import base64, html, io, json, re
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

Image.MAX_IMAGE_PIXELS = None
HERE = Path(__file__).resolve().parent.parent
RAW, IMG, GLOBE = HERE / "raw", HERE / "img", HERE / "globe"

PAN_RATIO = 2.05      # wider than this: pan across it at full screen height
PAN_H = 1080          # panoramas: height in pixels
PAN_MAX_W = 9000
STILL_BOX = (2400, 1350)  # other pictures fit in this box (never enlarged)
QUALITY = 86


def autocrop(im, thr=0.035):
    """Trim the black edges a mosaic leaves around a panorama: drop the outermost row or column with the most
    black pixels until every edge is at most `thr` black. Works on a small copy; returns a box in full size."""
    w, h = im.size
    s = min(1.0, 1200 / w)
    a = np.asarray(im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.BILINEAR).convert("RGB")).astype(np.int16)
    r, gb = a[..., 0], a[..., 1:].max(axis=2)
    # empty: black, or a gap one camera did not cover (pure red or pure cyan)
    black = (a.max(axis=2) < 10) | ((r < 14) & (gb > 50)) | ((gb < 14) & (r > 50))
    t, b, l, r = 0, black.shape[0], 0, black.shape[1]
    while b - t > 20 and r - l > 20:
        edges = {"t": black[t, l:r].mean(), "b": black[b - 1, l:r].mean(),
                 "l": black[t:b, l].mean(), "r": black[t:b, r - 1].mean()}
        k = max(edges, key=edges.get)
        if edges[k] <= thr:
            break
        if k == "t": t += 1
        elif k == "b": b -= 1
        elif k == "l": l += 1
        else: r -= 1
    return (int(l / s), int(t / s), int(r / s), int(b / s))


def save(im, path):
    im.save(path, "JPEG", quality=QUALITY, subsampling=0, optimize=True, progressive=True)


def picture(sid, meta, crop=None):
    """crop: None trims black mosaic edges automatically, False keeps the whole picture,
    [x0, y0, x1, y1] (fractions of width and height) cuts by hand where the edges are grey or white."""
    src = RAW / meta[sid]["file"]
    im = Image.open(src)
    im = im.convert("RGB")
    W, H = im.size
    if crop is False:
        box = (0, 0, W, H)
    elif crop:
        box = (round(crop[0] * W), round(crop[1] * H), round(crop[2] * W), round(crop[3] * H))
    else:
        box = autocrop(im)
    im = im.crop(box)
    w, h = im.size
    if w / h > PAN_RATIO:
        mode = "pan"
        scale = min(PAN_H / h, PAN_MAX_W / w, 1.0 if h >= PAN_H else PAN_H / h)
    else:
        mode = "still"
        scale = min(STILL_BOX[0] / w, STILL_BOX[1] / h, 1.0)
    if scale != 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    out = IMG / f"{sid}.jpg"
    save(im, out)
    return {"file": f"img/{sid}.jpg", "w": im.size[0], "h": im.size[1], "mode": mode, "crop": box,
            "kb": out.stat().st_size // 1024}


def globe_textures(meta):
    """Colour: the Viking MDIM 2.1 mosaic (longitude -180..180), a touch more saturated.
    Height: MOLA median topography, 1440x720 big-endian int16 metres from 0..360E, rolled to -180..180."""
    col = Image.open(RAW / meta["viking"]["file"]).convert("RGB").resize((2048, 1024), Image.LANCZOS)
    col = ImageEnhance.Color(col).enhance(1.2)
    col = ImageEnhance.Contrast(col).enhance(1.18)
    buf = io.BytesIO(); col.save(buf, "JPEG", quality=84, optimize=True)
    color_uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    z = np.fromfile(RAW / "megt90n000cb.img", dtype=">i2").reshape(720, 1440).astype(np.float32)
    z = np.roll(z, 720, axis=1)
    lo, hi = -8300.0, 21300.0
    g = Image.fromarray(np.clip((z - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)).resize((1024, 512), Image.BICUBIC)
    buf = io.BytesIO(); g.save(buf, "PNG", optimize=True)
    height_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    GLOBE.mkdir(exist_ok=True)
    (GLOBE / "textures.js").write_text(
        "// Written by mars3d/tools/build.py. Viking MDIM 2.1 colour mosaic (NASA/JPL/USGS) and MOLA topography\n"
        "// (NASA/GSFC), both public domain. Height: 0 = -8300 m, 255 = +21300 m.\n"
        f"window.MARS_TEX = {{lo: {lo}, hi: {hi},\ncolor: \"{color_uri}\",\nheight: \"{height_uri}\"}};\n",
        encoding="utf8")
    return len(color_uri) + len(height_uri), z


def elevation(z, lat, lon):
    """MOLA height in metres at a place (z: 720 rows from 90N, 1440 columns from 180W)."""
    r = int(np.clip((90 - lat) * 4, 0, 719)); c = int(np.clip((lon + 180) * 4, 0, 1439))
    return int(z[max(0, r - 1):r + 2, max(0, c - 1):c + 2].mean())


def plain(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def credit_of(sid, meta):
    m = meta[sid]
    if sid.startswith("ESA"):
        if sid == "ESA200429":
            return "ESA/MPS for OSIRIS Team", "CC BY-SA 3.0 IGO"
        return "ESA/DLR/FU Berlin", "CC BY-SA 3.0 IGO"
    return m["credit"], "Public domain (NASA)"


def main():
    show = json.loads((HERE / "slides.json").read_text(encoding="utf8"))
    meta = json.loads((RAW / "meta.json").read_text(encoding="utf8"))
    IMG.mkdir(exist_ok=True)
    keep = set()
    chapters = []
    for ch in show["chapters"]:
        out = dict(ch, slides=[])
        for s in ch["slides"]:
            p = picture(s["id"], meta, s.get("crop"))
            credit, licence = credit_of(s["id"], meta)
            out["slides"].append(dict({k: v for k, v in s.items() if k != "crop"}, **p, credit=credit, licence=licence, source=meta[s["id"]]["source"]))
            keep.add(Path(p["file"]).name)
            print(f"{s['id']:12} {p['mode']:5} {p['w']:5}x{p['h']:<5} {p['kb']:5} KB  crop {p['crop']}")
        chapters.append(out)
    for f in IMG.glob("*.jpg"):
        if f.name not in keep:
            f.unlink()
    n, z = globe_textures(meta)
    for ch in chapters:  # so the landing-site pin stands on the ground of the raised globe
        ch["elev"] = elevation(z, ch["lat"], ch["lon"])
        print(f"{ch['id']:13} ground at {ch['elev']:6} m")
    (HERE / "slides.js").write_text(
        "// Written by mars3d/tools/build.py from slides.json. Do not edit by hand.\n"
        "window.MARS3D = " + json.dumps({"title": show["title"], "chapters": chapters}, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf8")

    lines = ["# Mars in 3D: credits", "",
             "Every picture is a stereo pair from a spacecraft, published as a red/cyan anaglyph by its agency. "
             "NASA pictures are public domain (NASA's media guidelines ask for the credit line given); "
             "ESA pictures are licensed [CC BY-SA 3.0 IGO](https://creativecommons.org/licenses/by-sa/3.0/igo/). "
             "The pictures in `img/` are cropped to cut away black mosaic edges and resized; nothing else is changed.", ""]
    for ch in chapters:
        lines += [f"## {ch['mission']} ({ch['years']}, {ch['place']})", "", "| | Picture | Credit | Licence |", "| --- | --- | --- | --- |"]
        for s in ch["slides"]:
            lines.append(f"| `{s['id']}` | [{s['title']}]({s['source']}) | {s['credit']} | {s['licence']} |")
        lines.append("")
    lines += ["## The globe", "",
              f"- Colour: [Mars Viking MDIM 2.1 colour mosaic]({meta['viking']['source']}), NASA/JPL/USGS, public domain.",
              f"- Relief: [MOLA gridded topography]({meta['mola']['source']}) (MEGT90N000CB, 4 pixels per degree), "
              "NASA/GSFC MOLA Science Team, public domain. The globe exaggerates it.",
              "- Rendering: [three.js](https://threejs.org) r147, MIT licence (`vendor/three.min.js`, `vendor/LICENSE-three.txt`). "
              "The red/cyan mix uses Eric Dubois' least-squares anaglyph matrices, as three.js's AnaglyphEffect does.", ""]
    (HERE / "CREDITS.md").write_text("\n".join(lines), encoding="utf8")

    # the front page tile: a 16:9 cut from Curiosity at John Klein, Mount Sharp on the horizon
    t = Image.open(IMG / "PIA16925.jpg")
    w, h = t.size
    cw = int(h * 16 / 9)
    x = int(w * 0.52 - cw / 2)
    tile = t.crop((max(0, x), 0, max(0, x) + cw, h)).resize((1280, 720), Image.LANCZOS)
    save(tile, HERE / "preview.jpg")

    total = sum(f.stat().st_size for f in IMG.glob("*.jpg")) // 1048576
    print(f"{sum(len(c['slides']) for c in chapters)} pictures, img/ {total} MB, globe textures {n // 1024} KB")


if __name__ == "__main__":
    main()
