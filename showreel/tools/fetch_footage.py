"""Fetch the footage fragments for the show reel and cut them to 1920x1080, 30 fps.

Every source is free to reuse: NASA's Image and Video Library and NASA's Scientific
Visualization Studio (public domain, credit NASA). ffmpeg reads each remote file with
range requests, so only the seconds that are used get downloaded.

    python3 -I tools/fetch_footage.py            # fetch what is missing
    python3 -I tools/fetch_footage.py --force    # fetch everything again
    python3 -I tools/fetch_footage.py f2a q5     # fetch only these shots
"""
import json, os, subprocess, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "footage")
SHOTS = json.load(open(os.path.join(ROOT, "footage.json")))


def nasa(nasa_id, size="large", ext="mp4"):
    q = urllib.parse.quote(nasa_id)
    return f"http://images-assets.nasa.gov/video/{q}/{q}~{size}.{ext}"


def url_of(src):
    if src.get("nasa_id"):
        return nasa(src["nasa_id"], src.get("size", "large"), src.get("ext", "mp4"))
    return src["url"]


def fetch(shot, sources):
    src = sources[shot["src"]]
    speed = shot.get("speed", 1)
    need = shot["dur"] * speed
    vf = []
    if shot.get("crop"):
        vf.append("crop=" + shot["crop"])
    vf.append(f"setpts=PTS/{speed}" if speed != 1 else "setpts=PTS-STARTPTS")
    vf += ["fps=30", "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos", "crop=1920:1080"]
    if shot.get("grade"):  # the night-lights globe is rendered very dark: lift it so the lights read on a projector
        vf.append(shot["grade"])
    out = os.path.join(OUT, shot["id"] + ".mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(shot["ss"]), "-t", str(round(need, 3)), "-i", url_of(src),
           "-an", "-vf", ",".join(vf), "-t", str(shot["dur"]), "-c:v", "libx264", "-preset", "slow", "-crf", "17",
           "-g", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    for shot in SHOTS["shots"]:
        out = os.path.join(OUT, shot["id"] + ".mp4")
        if args and shot["id"] not in args:
            continue
        if os.path.exists(out) and not force and not args:
            continue
        try:
            fetch(shot, SHOTS["sources"])
            print("ok  ", shot["id"], f"{os.path.getsize(out) / 1e6:.1f} MB", flush=True)
        except subprocess.CalledProcessError as ex:
            print("FAIL", shot["id"], ex, flush=True)


if __name__ == "__main__":
    main()
