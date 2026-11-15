"""Cut the NASA clips the Big Muse's opening reel plays, from the Six Facts footage.

highlights.json names each clip: which Six Facts shot it comes from (showreel/footage.json), where to start and how
long. The footage itself is not in the repo (python3 -I showreel/tools/fetch_footage.py fetches it), so the clips are
cut once and committed: wall/media/<name>.mp4 (1080p, no sound) and wall/media/<name>.jpg (the first frame, shown
while the clip loads). NASA footage is in the public domain; footage.json keeps the source and credit of each shot.

    python3 -I wall/clips.py [footage folder]
"""
import json, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FOOTAGE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "showreel/assets/footage"
OUT = HERE / "media"


def main():
    clips = json.loads((HERE / "highlights.json").read_text(encoding="utf8"))["clips"]
    OUT.mkdir(exist_ok=True)
    for name, c in clips.items():
        src = FOOTAGE / (c["shot"] + ".mp4")
        if not src.exists():
            sys.exit(f"missing {src}: fetch the Six Facts footage first (showreel/tools/fetch_footage.py)")
        mp4, jpg = OUT / f"{name}.mp4", OUT / f"{name}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["ss"]), "-i", str(src), "-t", str(c["dur"]), "-an",
                        "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-r", "30", "-c:v", "libx264",
                        "-preset", "slow", "-crf", "24", "-movflags", "+faststart", str(mp4)], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["ss"]), "-i", str(src), "-frames:v", "1",
                        "-vf", "scale=1280:-2", "-q:v", "5", str(jpg)], check=True)
        print(f"{name}: {c['shot']} from {c['ss']} s for {c['dur']} s, {mp4.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
