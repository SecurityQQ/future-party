"""Build Book Projection 2050.

quotes.json is the quote list in play order. Each item has b (book id), q (exact text;
*word* marks italics in print), by (speaker, optional), where, conf (3 = checked against
the book text, 2 = two or more matching sources), src (links) and note.
Books and idea slides live in template.html. Run: python3 -I build.py
Writes dist/book-projection-2050.html (publish to the artifact) and
dist/quote-wall.html (a standalone copy that opens in any browser, for the projector),
both in the website's Blue futurism (vibes/restyle.py).
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BOOK_IDS = {"figueres", "ritchie", "drawdown", "ministry", "ai2041", "kelly", "earth4all", "lem",
            "porritt", "kaku", "chiang", "kurzweil", "klara", "megachange", "smith", "randers",
            "cityonmars", "limits", "clarke", "sagan"}

def check(quotes):
    errors = []
    for n, x in enumerate(quotes, 1):
        if x.get("b") not in BOOK_IDS: errors.append(f"#{n}: unknown book id {x.get('b')!r}")
        if not x.get("q"): errors.append(f"#{n}: empty quote")
        elif len(x["q"].split()) > 42: errors.append(f"#{n}: {len(x['q'].split())} words, over 42")
        if "</" in x.get("q", ""): errors.append(f"#{n}: markup in quote")
        if x.get("conf") not in (2, 3): errors.append(f"#{n}: conf must be 2 or 3")
        if not x.get("src") or not all(u.startswith("https://") for u in x["src"]):
            errors.append(f"#{n}: needs https source links")
    keys = [x["b"] + x["q"] for x in quotes]
    if len(set(keys)) != len(keys): errors.append("duplicate quotes")
    return errors

def blue(path):
    """Dress a written page in the website's Blue futurism (vibes/restyle.py), like every other page of the site."""
    import importlib.util
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("vibes_restyle", Path(__file__).resolve().parents[1] / "vibes" / "restyle.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.restyle_file(path)


def main():
    quotes = json.loads((HERE / "quotes.json").read_text(encoding="utf8"))
    errors = check(quotes)
    if errors:
        print("\n".join(errors)); sys.exit(1)
    tpl = (HERE / "template.html").read_text(encoding="utf8")
    if "const Q=/*QUOTES*/[];" not in tpl:
        print("template.html is missing the const Q=/*QUOTES*/[]; slot"); sys.exit(1)
    page = tpl.replace("const Q=/*QUOTES*/[];", "const Q=/*QUOTES*/" + json.dumps(quotes, ensure_ascii=False) + ";", 1)
    out = HERE / "dist"; out.mkdir(exist_ok=True)
    (out / "book-projection-2050.html").write_text(page, encoding="utf8")
    shell = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
             '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n')
    (out / "quote-wall.html").write_text(shell + page + "\n</html>\n", encoding="utf8")
    blue(out / "book-projection-2050.html"); blue(out / "quote-wall.html")
    print(f"{len(quotes)} quotes from {len({x['b'] for x in quotes})} books -> dist/")

if __name__ == "__main__":
    main()
