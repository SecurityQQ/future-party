"""Prepare everything the show reel plays besides the NASA footage (tools/fetch_footage.py).

    python3 -I tools/prepare_assets.py

- assets/further/<key>.mp4   the prediction slides, cut from the Further master (video/renders/, or release v3.0)
- assets/music/call-to-adventure.mp3   the score, trimmed to the film and brought under -1.5 dBTP
- assets/avatars/, assets/sfx/, assets/fonts/   copied from tweets/, roast/ and Google Fonts
"""
import json, os, shutil, subprocess, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
A = os.path.join(ROOT, "assets")
REEL = json.load(open(os.path.join(ROOT, "reel.json")))
FPS = 30
MASTER = os.path.join(REPO, "video", "renders", "further-2050-1080p.mp4")
MASTER_URL = "https://github.com/SecurityQQ/future-party/releases/download/v3.0/further-2050-1080p.mp4"
MUSIC_URL = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Call%20to%20Adventure.mp3"
FONTS = {
    "InstrumentSerif-Regular.woff2": "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjnTLgNs.woff2",
}
SFX = ["impact-bass-1", "impact-bass-2", "whoosh-short", "riser"]


def get(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)


def slide_starts():
    """Second at which each Further slide starts, from video/slides.json and the timings in video/tools/build.py."""
    card, burst, slide, intro = 36, 10, 105, 105
    d = json.load(open(os.path.join(REPO, "video", "slides.json")))
    f, out = intro, {}
    for ch in d["chapters"]:
        f += card + len(ch["burst"]) * burst
        for sl in ch["slides"]:
            hold = int(round(sl.get("hold", slide / FPS) * FPS))
            out[sl["key"]] = (f / FPS, hold / FPS)
            f += hold
    return out


def further():
    os.makedirs(os.path.join(A, "further"), exist_ok=True)
    src = MASTER
    if not os.path.exists(src):
        src = os.path.join(A, "further", "_master.mp4")
        if not os.path.exists(src):
            print("downloading the Further master from release v3.0 …")
            get(MASTER_URL, src)
    starts = slide_starts()
    keys = [k for ch in REEL["chapters"] for k in ch["slides"]] + [REEL["finale"]["slide"]]
    for k in keys:
        st, hold = starts[k]
        # The slide's own transition ends 0.1 s in and its caption starts to leave 0.25 s before the end, so a
        # cut holds 3.15 s of landed slide: one bar of the score plus the push on each side. The last slide of
        # the film keeps its own caption exit and fade to the ground.
        a, dur = (st + 0.1, hold - 0.2) if k == REEL["finale"]["slide"] else (st + 0.1, 3.15)
        out = os.path.join(A, "further", k + ".mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.4f}", "-i", src, "-t", f"{dur:.4f}", "-an",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-g", "15", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", out], check=True)
        print("slide", k, f"{a:.2f}s +{dur:.2f}s")


def music():
    os.makedirs(os.path.join(A, "music"), exist_ok=True)
    raw = os.path.join(A, "music", "_call-to-adventure-full.mp3")
    if not os.path.exists(raw):
        get(MUSIC_URL, raw)
    m = REEL["music"]
    out = os.path.join(A, "music", "call-to-adventure.mp3")
    af = f"volume={m['gain_db']}dB,alimiter=limit={m['limit']}:level=false,afade=t=out:st={m['fade_at']}:d={m['length'] - m['fade_at']}"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(m["offset"]), "-i", raw, "-t", str(m["length"]), "-af", af,
                    "-c:a", "libmp3lame", "-b:a", "192k", out], check=True)
    print("music", out)


def copies():
    os.makedirs(os.path.join(A, "avatars"), exist_ok=True)
    for ch in REEL["chapters"]:
        h = ch["tweet"]["h"]
        shutil.copy(os.path.join(REPO, "tweets", "avatars", h + ".jpg"), os.path.join(A, "avatars", h + ".jpg"))
    os.makedirs(os.path.join(A, "sfx"), exist_ok=True)
    for s in SFX:
        shutil.copy(os.path.join(REPO, "roast", "assets", "sfx", s + ".mp3"), os.path.join(A, "sfx", s + ".mp3"))
    os.makedirs(os.path.join(A, "fonts"), exist_ok=True)
    for name, url in FONTS.items():
        p = os.path.join(A, "fonts", name)
        if not os.path.exists(p):
            get(url, p)
    print("avatars, sfx, fonts ok")


if __name__ == "__main__":
    copies()
    music()
    further()
