"""Cut The Roast's pictures again from the two wall films: one 1920x1080 frame of every slide The Roast shows, taken
when the slide's caption has landed, so the exhibits are exactly what played.

    python3 -I roast/tools/stills.py <already-here-1080p.mp4> [<further-1080p.mp4>]

assets/v1/<key>.jpg come from Already Here (video/slides_v1.json, timings of video/tools/build_v1.py) and
assets/v2/<key>.jpg from Further (video/slides.json, timings of video/tools/build.py; default
video/renders/further-2050-1080p.mp4, or release v3.0). Run tools/build.py and render afterwards.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
FPS = 30
sys.dont_write_bytecode = True  # importing build.py below would otherwise leave tools/__pycache__ in the repo
sys.path.insert(0, os.path.join(ROOT, "tools"))
from build import EXHIBITS, RECUT  # noqa: E402  (the keys The Roast shows)


def starts(slides, card, burst, slide, intro):
    """Second at which each slide starts and how long it holds."""
    d = json.load(open(os.path.join(REPO, "video", slides)))
    f, out = intro, {}
    for ch in d["chapters"]:
        f += card + len(ch["burst"]) * burst
        for sl in ch["slides"]:
            hold = int(round(sl.get("hold", slide / FPS) * FPS))
            out[sl["key"]] = (f / FPS, hold / FPS)
            f += hold
    return out


def grab(src, at, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", src, "-frames:v", "1", "-q:v", "2", out], check=True)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    v1 = sys.argv[1]
    v2 = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REPO, "video", "renders", "further-2050-1080p.mp4")
    # The caption is in by 1.3 s and starts to leave 0.25 s before the slide ends
    s1 = starts("slides_v1.json", card=36, burst=10, slide=90, intro=105)
    s2 = starts("slides.json", card=36, burst=10, slide=105, intro=105)
    for folder, src, keys, st in (("v1", v1, [k for k, _ in EXHIBITS], s1), ("v2", v2, RECUT, s2)):
        os.makedirs(os.path.join(ROOT, "assets", folder), exist_ok=True)
        for k in keys:
            t, hold = st[k]
            grab(src, t + min(1.8, hold - 0.5), os.path.join(ROOT, "assets", folder, k + ".jpg"))
            print(folder, k, f"{t + min(1.8, hold - 0.5):.2f}s")


if __name__ == "__main__":
    main()
