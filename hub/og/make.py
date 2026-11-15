"""Make the pictures a shared link shows: the share cards (og:image) and the site's icons, into hub/og/.

- site.jpg: the party site's card, 1200x630 (card.html?card=site): Future Party 2050 and the chrome orbit;
- app.jpg: the party app's card, 1200x630 (card.html?card=app): The Future 2050 and three Kin;
- favicon.ico (16, 32, 48) and apple-touch-icon.png (180), drawn from the app's icon, app/app/icon.svg.

hub/site.py copies them to the root of the site (/og.jpg, /og-app.jpg, /favicon.ico, /apple-touch-icon.png) and
hub/seo.py points every page at them. The files are committed: the deploy has no Chrome.

    python3 -I hub/og/make.py

Needs Google Chrome, Pillow and the internet (the fonts come from Google Fonts). Run it again when the look changes.
"""
import subprocess, sys, tempfile
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
NAVY = "#030817"


def screenshot(url, w, h, out):
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--allow-file-access-from-files", f"--user-data-dir={prof}", f"--window-size={w},{h}",
                        "--virtual-time-budget=8000", f"--screenshot={out}", url],
                       check=True, capture_output=True, timeout=120)
    img = Image.open(out).convert("RGB")
    if img.size != (w, h):
        sys.exit(f"{url}: Chrome made {img.size}, not {(w, h)}")
    return img


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for card in ("site", "app"):
            img = screenshot(f"{(HERE / 'card.html').as_uri()}?card={card}", 1200, 630, tmp / f"{card}.png")
            img.save(HERE / f"{card}.jpg", quality=88, optimize=True, progressive=True)
        # The icon on a navy square: iOS rounds the corners itself, and transparent corners would turn black there
        page = tmp / "icon.html"
        page.write_text(f'<body style="margin:0;background:{NAVY}"><img src="{(ROOT / "app/app/icon.svg").as_uri()}" '
                        'style="display:block;width:512px;height:512px">', encoding="utf8")
        icon = screenshot(page.as_uri(), 512, 512, tmp / "icon.png")
    icon.resize((180, 180), Image.LANCZOS).save(HERE / "apple-touch-icon.png", optimize=True)
    icon.save(HERE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for name in ("site.jpg", "app.jpg", "apple-touch-icon.png", "favicon.ico"):
        print(f"hub/og/{name}: {(HERE / name).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
