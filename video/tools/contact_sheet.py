"""Render one contact sheet per chapter from assets/candidates.json with headless Chrome."""
import json, os, subprocess, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def main(chapters):
    data = json.load(open(os.path.join(ROOT, "assets", "candidates.json")))
    os.makedirs(os.path.join(ROOT, "snapshots"), exist_ok=True)
    for chap in chapters:
        rows = []
        keys = [k for k, v in data.items() if v["chapter"] == chap]
        for k in keys:
            cells = []
            for i, c in enumerate(data[k]["candidates"]):
                p = os.path.join(ROOT, "assets", "candidates", k, f"{i}.jpg")
                if not os.path.exists(p):
                    continue
                lic = html.escape(c["license"][:18])
                cells.append(f'<div class="c"><img src="file://{p}"><b>{k} {i}</b><i>{c["w"]}x{c["h"]} · {lic}</i></div>')
            rows.append(f'<div class="r"><div class="k">{k}</div>{"".join(cells) or "<em>none</em>"}</div>')
        page = ("<html><body style='margin:0;background:#111;color:#fff;font:14px Inter,Arial'>"
                "<style>.r{display:flex;gap:6px;align-items:flex-start;padding:4px}.k{width:90px;font-weight:700}"
                ".c{width:300px;position:relative}.c img{width:300px;height:169px;object-fit:cover;display:block}"
                ".c b{position:absolute;left:4px;top:4px;background:#000c;padding:1px 4px}"
                ".c i{display:block;font-size:11px;color:#aaa}</style>" + "".join(rows) + "</body></html>")
        hp = os.path.join(ROOT, "snapshots", f"sheet-{chap}.html")
        open(hp, "w").write(page)
        out = os.path.join(ROOT, "snapshots", f"sheet-{chap}.png")
        h = 30 + len(keys) * 200
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                        f"--window-size=1640,{h}", f"--screenshot={out}", "file://" + hp],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(out)


if __name__ == "__main__":
    main(sys.argv[1:] or ["city", "machines", "space"])
