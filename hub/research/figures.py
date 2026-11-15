"""Make the figures of the 2050 Research papers (hub/research/<key>.jpg, 1280x720): the front page's paper cards and
the end of every research page show them.

A figure is the paper's visual abstract, legible at the size of a card:
- "crop": a 16:9 window inside the one graphic on the paper's page that says what is inside (the book spines, the
  five forces era by era), shot by headless Chrome from a local server on the repo; the films' frame palettes are
  vertical stripes, so their whole strip is stretched to 16:9 instead;
- "picture": a picture the repo already has (Further's poster, Mirror 2050's eight effects);
- "faces" and "numbers": drawn here from the paper's data, for the papers made of posts (the authors' faces from
  tweets/avatars, the six findings' numbers), in the site's look, and shot the same way.

    python3 -I hub/research/figures.py             # all of them
    python3 -I hub/research/figures.py books why   # some of them

Needs Google Chrome and Pillow, and the network for the site's fonts (Google Fonts). It drives Chrome over
--remote-debugging-pipe, so it needs nothing else. Run it again when a page's look changes.
"""
import base64, fcntl, functools, html, http.server, io, json, math, os, subprocess, sys, tempfile, threading, time
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
W, H = 1280, 720
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# The six findings of 2050 in Futurists' Tweets, as its page states them: the number, then what it counts
FINDINGS = [("14", "predictions by Khosla"), ("2–3×", "electricity, mostly clean"), ("≈2030", "strong AI"),
            ("1 in 5", "people over 60"), ("~2050", "a city on Mars"), ("web", "used mostly by AI agents")]

FIGURES = {
    "books": {"crop": "books/dist/book-projection-2050.html", "sel": "#shelf", "anchor": 0.5},
    "tweets": {"faces": "all"},
    "futurists": {"faces": "core"},
    "futurists_short": {"numbers": FINDINGS},
    "further": {"picture": "video/dist/media/further-poster.jpg"},
    "films": {"crop": "reel/projection-2050.html", "sel": "#barcode", "stretch": True},
    "why": {"crop": "music/dist/why-music-changes.html", "sel": "#mx", "anchor": 0},
    "mirror_research": {"picture": "mirror/preview.jpg"},
}

HEAD = """<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600&family=Geologica:wght@400;500&family=Martian+Mono:wght@500&display=block">
<style>
html,body{margin:0;width:1280px;height:720px;overflow:hidden}
body{background:radial-gradient(ellipse at 50% 120%,rgb(67 133 255 / 26%),transparent 60%),radial-gradient(ellipse at 85% 0%,rgb(30 75 151 / 30%),transparent 45%),#030817;color:#edf4ff;font-family:Geologica,system-ui,sans-serif}
.chrome{background:linear-gradient(118deg,#f2f7ff 0%,#aec6e8 21%,#edf6ff 42%,#7da2d1 44%,#b8d6f7 68%,#e2efff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
</style>
"""


def faces_page(which):
    t = json.loads((ROOT / "tweets/tweets.json").read_text(encoding="utf8"))
    authors = [a for a in t["authors"].values() if which == "all" or a.get("core")]
    pic = lambda a: f"../../tweets/avatars/{a['h']}.jpg"
    if which == "all":
        # every author, a wall of faces; the core twelve first, a little brighter
        cells = "".join(f'<img src="{html.escape(pic(a))}" class="{"core" if a.get("core") else ""}">' for a in authors)
        return HEAD + f"""<style>
.wall{{position:absolute;inset:0;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:18px;padding:0 90px}}
.wall img{{width:92px;height:92px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #2d486d;filter:saturate(.75)}}
.wall img.core{{box-shadow:0 0 0 2px #9dd8ff,0 0 22px rgb(67 133 255 / 45%);filter:none}}
</style><div class="wall">{cells}</div>"""
    # the core twelve on an orbit tilted like the party's mark, 2050 at the centre
    n, rx, ry, tilt = len(authors), 470, 200, math.radians(-12)
    imgs = []
    for i, a in enumerate(authors):
        ang = -math.pi / 2 + 2 * math.pi * i / n
        x, y = rx * math.cos(ang), ry * math.sin(ang)
        x, y = x * math.cos(tilt) - y * math.sin(tilt), x * math.sin(tilt) + y * math.cos(tilt)
        imgs.append(f'<img src="{html.escape(pic(a))}" style="left:{640 + x - 56:.0f}px;top:{360 + y - 56:.0f}px">')
    return HEAD + f"""<style>
.orbit{{position:absolute;left:{640 - rx}px;top:{360 - ry}px;width:{2 * rx}px;height:{2 * ry}px;border:1.5px solid rgb(157 216 255 / 35%);border-radius:50%;transform:rotate(-12deg)}}
img{{position:absolute;width:112px;height:112px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #030817,0 0 0 5px #9dd8ff,0 0 30px rgb(67 133 255 / 45%)}}
.yr{{position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font:600 150px/1 Unbounded;letter-spacing:-.04em}}
</style><div class="orbit"></div><div class="yr chrome">2050</div>{''.join(imgs)}"""


def numbers_page(rows):
    cells = "".join(f'<div><b class="chrome">{html.escape(n)}</b><span>{html.escape(t)}</span></div>' for n, t in rows)
    return HEAD + f"""<style>
.grid{{position:absolute;inset:150px 90px 60px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:0 50px}}
.grid div{{display:flex;flex-direction:column;justify-content:center;gap:16px;border-top:1.5px solid rgb(143 170 207 / 35%)}}
b{{font:500 84px/1 Unbounded;letter-spacing:-.05em}}
span{{font:400 27px/1.25 Geologica;color:#a2b6d4}}
</style><div class="grid">{cells}</div>"""


def serve():
    """Serve the repo on a free port (UTF-8, as the site serves it), so the pages load their files as on the site."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".html": "text/html; charset=utf-8"}

        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_port}/"


class Chrome:
    """Just enough of the DevTools protocol over a pipe: one page, navigate, evaluate, screenshot."""

    def __init__(self):
        self.prof = tempfile.TemporaryDirectory()
        r_in, w_in = os.pipe()    # we write, Chrome reads (its fd 3)
        r_out, w_out = os.pipe()  # Chrome writes (its fd 4), we read
        # Move the child's ends above 3 and 4 first, so putting one in place never overwrites the other
        hi_in, hi_out = fcntl.fcntl(r_in, fcntl.F_DUPFD, 10), fcntl.fcntl(w_out, fcntl.F_DUPFD, 10)
        os.close(r_in)
        os.close(w_out)

        def fds():
            os.dup2(hi_in, 3)
            os.dup2(hi_out, 4)
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", "--remote-debugging-pipe", "--hide-scrollbars", "--mute-audio",
             "--force-device-scale-factor=1", f"--user-data-dir={self.prof.name}", "about:blank"],
            close_fds=False, preexec_fn=fds, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.close(hi_in)
        os.close(hi_out)
        self.w = os.fdopen(w_in, "wb", buffering=0)
        self.r = os.fdopen(r_out, "rb", buffering=0)
        self.buf, self.n = b"", 0
        tid = self.call("Target.createTarget", url="about:blank")["targetId"]
        self.sid = self.call("Target.attachToTarget", targetId=tid, flatten=True)["sessionId"]
        self.call("Page.enable", session=True)

    def call(self, method, session=False, **params):
        self.n += 1
        msg = {"id": self.n, "method": method, "params": params}
        if session:
            msg["sessionId"] = self.sid
        self.w.write(json.dumps(msg).encode() + b"\0")
        while True:
            while b"\0" not in self.buf:
                chunk = self.r.read(1 << 16)
                if not chunk:
                    raise RuntimeError("Chrome closed the pipe")
                self.buf += chunk
            raw, self.buf = self.buf.split(b"\0", 1)
            m = json.loads(raw)
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})

    def js(self, expr):
        r = self.call("Runtime.evaluate", session=True, expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def open(self, url, width, wait_for="body"):
        self.call("Emulation.setDeviceMetricsOverride", session=True, width=width, height=720, deviceScaleFactor=1,
                  mobile=False)
        self.call("Page.navigate", session=True, url=url)
        for _ in range(80):
            time.sleep(0.25)
            if self.js(f"document.readyState==='complete'&&!!document.querySelector({json.dumps(wait_for)})"):
                break
        self.js("document.fonts?document.fonts.ready.then(()=>1):1")
        time.sleep(1.2)  # pictures and the page's own drawing

    def shot(self, x, y, w, h):
        r = self.call("Page.captureScreenshot", session=True, format="png", captureBeyondViewport=True,
                      clip={"x": x, "y": y, "width": w, "height": h, "scale": W / w})
        return Image.open(io.BytesIO(base64.b64decode(r["data"]))).convert("RGB")

    def close(self):
        self.proc.terminate()
        self.proc.wait(timeout=10)
        self.prof.cleanup()


def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def crop(ch, base, spec):
    """The largest 16:9 window inside the element: its full height, placed along it by anchor (0 left, .5 centre).
    stretch: the whole element, stretched to 16:9 (for vertical stripes, which have nothing to lose in height)."""
    ch.open(base + spec["crop"], 1440, spec["sel"])
    b = ch.js("""(()=>{const e=document.querySelector(%s);e.scrollIntoView({block:'center'});
      const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()"""
              % json.dumps(spec["sel"]))
    time.sleep(0.6)
    if spec.get("stretch"):
        return ch.shot(b["x"], b["y"], b["w"], b["h"]).resize((W, H), Image.LANCZOS)
    w, h = b["w"], b["h"]
    if w / h > W / H:
        w = h * W / H
    else:
        h = w * H / W
    x = b["x"] + (b["w"] - w) * spec["anchor"]
    y = b["y"] + (b["h"] - h) / 2
    return ch.shot(x, y, w, h)


def drawn(ch, base, key, page):
    tmp = HERE / f".figure-{key}.html"
    tmp.write_text(page, encoding="utf8")
    try:
        ch.open(base + tmp.relative_to(ROOT).as_posix(), W)
        return ch.shot(0, 0, W, H)
    finally:
        tmp.unlink()


def main(keys):
    base, ch = serve(), None
    try:
        for key in keys:
            spec = FIGURES[key]
            if "picture" in spec:
                im = cover(Image.open(ROOT / spec["picture"]).convert("RGB"), W, H)
            else:
                ch = ch or Chrome()
                if "crop" in spec:
                    im = crop(ch, base, spec)
                elif "faces" in spec:
                    im = drawn(ch, base, key, faces_page(spec["faces"]))
                else:
                    im = drawn(ch, base, key, numbers_page(spec["numbers"]))
            out = HERE / f"{key}.jpg"
            cover(im, W, H).save(out, quality=84, optimize=True, progressive=True)
            print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")
    finally:
        if ch:
            ch.close()


if __name__ == "__main__":
    wanted = sys.argv[1:] or list(FIGURES)
    unknown = [k for k in wanted if k not in FIGURES]
    if unknown:
        sys.exit(f"unknown: {unknown}; choose from {list(FIGURES)}")
    main(wanted)
