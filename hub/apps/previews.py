"""Make the 16:9 preview pictures of the Apps section on the front page (hub/apps/<id>.jpg, 1280x720).

Play: 2050 and History of Music 2050 are screenshots of their pages, taken with headless Chrome from a local server
on the repo. The Future 2050 is a screenshot of the live app's pass scanner (signed out, read-only: the home page
writes nothing) over the Arrival Station with three Kin. Mirror 2050 takes four of the eight effects from
mirror/preview.jpg, Imagined Futures six pictures from concept-art/thumbs. Mars in 3D uses mars3d/preview.jpg as it is.

    python3 -I hub/apps/previews.py            # all of them
    python3 -I hub/apps/previews.py mirror art # some of them

Needs Google Chrome and Pillow. Run it again when an app's look changes.
"""
import functools, http.server, subprocess, sys, tempfile, threading
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
W, H = 1280, 720
NAVY = (3, 8, 23)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
APP = "https://vargafutureparty.com/app"


def screenshot(url, size, out):
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--mute-audio", f"--user-data-dir={prof}",
                        f"--window-size={size[0]},{size[1]}", "--virtual-time-budget=6000", f"--screenshot={out}", url],
                       check=True, capture_output=True, timeout=120)
    return Image.open(out).convert("RGB")


def serve():
    """Serve the repo on a free port, so the pages load their files the way they do on the site."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_port}/"


def cover(im, w, h):
    """Scale and centre-crop to exactly w x h."""
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def rounded(im, r, border=None, width=3):
    """The picture with round corners and an optional edge, as RGBA."""
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    if border:
        ImageDraw.Draw(out).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, outline=border, width=width)
    return out


def shadow(canvas, box, r, blur=24, alpha=150):
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(box, r, fill=(0, 0, 0, alpha))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def grid(pictures, cols, rows, gap=4):
    out = Image.new("RGB", (W, H), NAVY)
    cw, ch = (W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows
    for i, im in enumerate(pictures):
        c, r = i % cols, i // cols
        x0, y0 = round(c * (cw + gap)), round(r * (ch + gap))
        x1, y1 = round(c * (cw + gap) + cw), round(r * (ch + gap) + ch)
        out.paste(cover(im, x1 - x0, y1 - y0), (x0, y0))
    return out


def play(base, tmp):
    return screenshot(base + "soundboard/dist/contact2050.html", (W, H), tmp / "play.png")


def music(base, tmp):
    # The page opens on History: the era folders and the first era's stops, under the History / Music of the
    # Future / Research tabs
    return screenshot(base + "music/resonance/dist/local/index.html", (W, H), tmp / "music.png")


def app(base, tmp):
    # Headless Chrome keeps windows at least 500 px wide; the app's own layout fits that width
    phone = screenshot(APP, (500, 1000), tmp / "app.png").crop((0, 0, 500, 806))
    canvas = cover(Image.open(ROOT / "app/public/app/img/station.webp").convert("RGB"), W, H).convert("RGBA")
    shade = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(shade)
    for x in range(W):  # navy on the left for the Kin, lighter towards the phone
        d.line((x, 0, x, H), fill=NAVY + (round(205 - 95 * x / W),))
    canvas.alpha_composite(shade)
    for name, x, y in [("grumm", 60, 250), ("ilu", 305, 200), ("vexa", 550, 250)]:
        kin = Image.open(ROOT / f"app/public/app/img/{name}.webp").convert("RGB").resize((228, 228), Image.LANCZOS)
        shadow(canvas, (x, y + 10, x + 228, y + 238), 22)
        canvas.alpha_composite(rounded(kin, 22, (157, 216, 255, 200), 2), (x, y))
    ph = phone.resize((round(phone.width * 640 / phone.height), 640), Image.LANCZOS)
    px, py = W - ph.width - 56, 40
    shadow(canvas, (px, py + 12, px + ph.width, py + ph.height + 12), 34, 30, 190)
    canvas.alpha_composite(rounded(ph, 34, (220, 233, 251, 230), 3), (px, py))
    return canvas.convert("RGB")


def mirror(base, tmp):
    # mirror/preview.jpg is the eight effects in 4 x 2; take Neon Swarm, Holo Cube, Portal and Matrix
    strip = Image.open(ROOT / "mirror/preview.jpg").convert("RGB")
    tw, th = strip.width // 4, strip.height // 2
    tiles = [strip.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th)) for c, r in [(1, 0), (2, 0), (3, 0), (2, 1)]]
    return grid(tiles, 2, 2)


ART = ["2118267091262333357-1", "1355522273168470016-1", "1613673342099415040-1",
       "1674971255986962432-1", "1626743626587082753-3", "1752742562337595791-1"]


def art(base, tmp):
    # The Prometheus Ring, a toroidal colony (1982), Blade Runner's city, a 1980s Japanese spaceship,
    # a 1984 computer-graphics shuttle and the Lunar Cosmodrome (1973)
    return grid([Image.open(ROOT / f"concept-art/thumbs/{n}.jpg").convert("RGB") for n in ART], 3, 2)


MAKERS = {"app": app, "mirror": mirror, "play": play, "music": music, "art": art}


def main():
    want = sys.argv[1:] or list(MAKERS)
    base = serve()
    with tempfile.TemporaryDirectory() as t:
        for name in want:
            im = MAKERS[name](base, Path(t))
            if im.size != (W, H):
                im = cover(im, W, H)
            out = HERE / f"{name}.jpg"
            im.save(out, quality=84, optimize=True, progressive=True)
            print(f"{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
