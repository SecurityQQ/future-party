"""Write index.html and compositions/*.html from slides.json (static HTML, explicit tweens)."""
import html, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
CARD, BURST, SLIDE, OVER, INTRO, OUTRO = 36, 10, 105, 3, 105, 120
GROUND, ACCENT = "#0b0b0d", "#ff5315"
KB = ["push", "panl", "pull", "panr"]
CONTAIN = set()
TR = ["whip", "zoom", "whip", "zoom"]  # default transition cycle; a slide may set "tr"


def s(f):
    return round(f / FPS, 6)


def e(t):
    return html.escape(t, quote=True)


def kb_tween(sel, mode, t, d):
    if mode == "push":
        return f"tl.fromTo('{sel}',{{scale:1}},{{scale:1.07,duration:{d},ease:'none'}},{t});"
    if mode == "pull":
        return f"tl.fromTo('{sel}',{{scale:1.07}},{{scale:1,duration:{d},ease:'none'}},{t});"
    x = 1.6 if mode == "panl" else -1.6
    return f"tl.fromTo('{sel}',{{scale:1.06,xPercent:{x}}},{{scale:1.06,xPercent:{-x},duration:{d},ease:'none'}},{t});"


CHAPTER_CSS = f"""
    #root{{position:absolute;inset:0;overflow:hidden;background:{GROUND};font-family:Inter,sans-serif}}
    .card{{position:absolute;inset:0;background:{GROUND}}}
    .cin{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}}
    .num{{font:700 40px/1 Inter,sans-serif;letter-spacing:.14em;color:{ACCENT}}}
    .word{{font-family:'League Gothic',sans-serif;font-size:330px;line-height:.86;color:#fff;text-transform:uppercase;letter-spacing:.01em;white-space:nowrap}}
    .shot{{position:absolute;inset:0;overflow:hidden}}
    .shot.burst{{background:#000}}
    .mv,.kb{{position:absolute;inset:0}}
    .kb img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}}
    .scrim{{position:absolute;left:0;right:0;bottom:0;height:72%;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,.45) 35%,rgba(0,0,0,.8) 70%,rgba(0,0,0,.9) 100%)}}
    .scrim.strong{{height:80%;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,.6) 30%,rgba(0,0,0,.88) 65%,rgba(0,0,0,.95) 100%)}}
    .credit{{position:absolute;right:96px;bottom:54px;font:500 20px/1.2 Inter,sans-serif;color:rgba(255,255,255,.74)}}
    .cap{{position:absolute;left:192px;bottom:124px;width:1520px;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.6)}}
    .kick{{font:800 36px/1.15 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:{ACCENT}}}
    .kick i{{font-style:normal;font-weight:700;color:rgba(255,255,255,.78)}}
    .hero{{font-family:'League Gothic',sans-serif;font-size:136px;line-height:.92;text-transform:uppercase;letter-spacing:.01em;margin-top:12px}}
    .hero span{{display:inline-block;margin-right:.2em}}
    .now{{font:600 36px/1.25 Inter,sans-serif;color:rgba(255,255,255,.92);margin-top:20px}}
    .now b{{font-weight:800;font-size:28px;letter-spacing:.12em;text-transform:uppercase;margin-right:16px;vertical-align:3px}}
    .dip{{position:absolute;inset:0}}
    .dipc{{position:absolute;inset:0;background:#000}}
    .dipc.ground{{background:{GROUND}}}
"""


def chapter(ch, credits, last):
    cid = ch["id"]
    sign = -1 if ch["dir"] == "left" else 1
    els, js, defs = [], [], []
    z = 1
    # card
    els.append(f'<div id="{cid}-card" class="clip card" data-start="0" data-duration="{s(CARD)}" data-track-index="1" style="z-index:{z}">'
               f'<div class="cin" id="{cid}-cin"><div class="num" id="{cid}-num">{e(ch["num"])}</div>'
               f'<div class="word" id="{cid}-word">{e(ch["word"])}</div></div></div>')
    js += [f"tl.fromTo('#{cid}-num',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},0);",
           f"tl.fromTo('#{cid}-word',{{opacity:0,filter:'blur(10px)'}},{{opacity:1,filter:'blur(0px)',duration:0.17,ease:'power4.out'}},0.03);",
           f"tl.fromTo('#{cid}-cin',{{scale:1}},{{scale:6,duration:0.35,ease:'power3.in',immediateRender:false}},{s(CARD) - 0.35});"]
    # burst
    f0 = CARD
    for j, key in enumerate(ch["burst"]):
        z += 1
        st = s(f0 + j * BURST)
        du = round(s(f0 + (j + 1) * BURST) - st, 6)
        els.append(f'<div id="{cid}-b{j}" class="clip shot burst" data-start="{st}" data-duration="{du}" data-track-index="2" style="z-index:{z}">'
                   f'<div class="kb" id="{cid}-b{j}-kb"><img src="assets/photos/{key}.jpg" alt=""></div>'
                   + (f'<div class="credit" data-layout-ignore>{e(credits[key])}</div>' if credits.get(key) else '') + '</div>')
        js.append(f"tl.fromTo('#{cid}-b{j}-kb',{{scale:1.06}},{{scale:1,duration:{du},ease:'expo.out'}},{st});")
    last_b = f0 + (len(ch["burst"]) - 1) * BURST
    z += 1
    els.append(f'<div id="{cid}-bdip" class="clip dip" data-start="{s(last_b)}" data-duration="{round(s(last_b + BURST) - s(last_b), 6)}" data-track-index="3" style="z-index:{z}"><div class="dipc" id="{cid}-bdipc"></div></div>')
    js.append(f"tl.fromTo('#{cid}-bdipc',{{opacity:0}},{{opacity:0.4,duration:{s(3)},ease:'none'}},{s(last_b + BURST - 3)});")
    # slides
    starts = []
    f = f0 + len(ch["burst"]) * BURST
    for sl in ch["slides"]:
        starts.append(f)
        f += int(round(sl.get("hold", SLIDE / FPS) * FPS))
    end = f
    n = len(ch["slides"])
    for i, sl in enumerate(ch["slides"]):
        key, base = sl["key"], f"{cid}-s{i}"
        a = starts[i] - (OVER if i > 0 else 0)
        b = (starts[i + 1] + OVER) if i < n - 1 else end
        z += 1
        defs.append(f'<filter id="{base}-mb" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">'
                    f'<feGaussianBlur id="{base}-fb" stdDeviation="0 0"/></filter>')
        words = "".join(f'<span id="{base}-w{k}">{e(w)}</span>' for k, w in enumerate(sl["hero"].split()))
        label = sl.get("seed_year") or sl.get("label", "Now")
        kick = e(sl.get("year", sl.get("film", "")))
        if sl.get("year") and sl.get("film"):
            kick += f'<i> · {e(sl["film"])}</i>'
        nowtxt = sl.get("seed") or sl.get("now", "")
        els.append(
            f'<div id="{base}" class="clip shot" data-start="{s(a)}" data-duration="{round(s(b) - s(a), 6)}" data-track-index="4" style="z-index:{z}">'
            f'<div class="mv" id="{base}-mv" style="filter:url(#{base}-mb)">'
            f'<div class="kb" id="{base}-kb"><img src="assets/photos/{key}.jpg" alt="{e(sl["hero"])}"></div>'
            f'<div class="scrim{" strong" if sl.get("scrim") == "strong" else ""}"></div><div class="credit" data-layout-ignore>{e(sl["credit"])}</div></div>'
            f'<div class="cap" id="{base}-cap"><div class="kick" id="{base}-k">{kick}</div>'
            f'<div class="hero" id="{base}-h">{words}</div>'
            f'<div class="now" id="{base}-n"><b>{e(label)}</b>{e(nowtxt)}</div></div></div>')
        mode = "push" if key in CONTAIN else KB[i % 4]
        js.append(kb_tween(f"#{base}-kb", mode, s(a), round(s(b) - s(a), 6)))
        ts, te = s(starts[i]), s(starts[i + 1]) if i < n - 1 else s(end)
        js.append(f"tl.fromTo('#{base}-k',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.17,ease:'power4.out'}},{round(ts + 0.12, 4)});")
        for k, _ in enumerate(sl["hero"].split()):
            js.append(f"tl.fromTo('#{base}-w{k}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},{round(ts + 0.22 + k * 0.067, 4)});")
        js.append(f"tl.fromTo('#{base}-n',{{opacity:0,color:'#8a8a8a'}},{{opacity:1,color:'rgba(255,255,255,0.92)',duration:0.2,ease:'power2.out'}},{round(ts + 0.5, 4)});")
        exit_at = round(te - (0.55 if i == n - 1 and last else 0.25), 4)
        js.append(f"tl.fromTo('#{base}-cap',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:0.15,ease:'power2.in',immediateRender:false}},{exit_at});")
        tr = sl.get("tr") or TR[i % len(TR)]
        if i > 0 and tr == "zoom":  # push through the old frame into the new one
            t0 = s(starts[i] - OVER)
            prev = f"{cid}-s{i - 1}"
            js += [f"tl.fromTo('#{prev}-mv',{{scale:1}},{{scale:1.35,duration:{s(2 * OVER)},ease:'power2.in',immediateRender:false}},{t0});",
                   f"tl.fromTo('#{base}-mv',{{scale:1.3,opacity:0}},{{scale:1,opacity:1,duration:{s(2 * OVER)},ease:'power3.out'}},{t0});",
                   f"tl.fromTo('#{base}-fb',{{attr:{{stdDeviation:'16 16'}}}},{{attr:{{stdDeviation:'0 0'}},duration:{s(2 * OVER)},ease:'power2.out'}},{t0});"]
        elif i > 0:  # whip from the previous slide into this one
            sign = -sign if tr == "whip" and i % 4 == 2 else sign
            t0 = s(starts[i] - OVER)
            prev = f"{cid}-s{i - 1}"
            js += [f"tl.fromTo('#{prev}-mv',{{xPercent:0}},{{xPercent:{sign * 100},duration:{s(2 * OVER)},ease:'power2.inOut',immediateRender:false}},{t0});",
                   f"tl.fromTo('#{base}-mv',{{xPercent:{-sign * 100}}},{{xPercent:0,duration:{s(2 * OVER)},ease:'power2.inOut'}},{t0});"]
            for fb in (f"#{prev}-fb", f"#{base}-fb"):
                js += [f"tl.fromTo('{fb}',{{attr:{{stdDeviation:'0 0'}}}},{{attr:{{stdDeviation:'40 0'}},duration:{s(OVER)},ease:'power2.in',immediateRender:false}},{t0});",
                       f"tl.fromTo('{fb}',{{attr:{{stdDeviation:'40 0'}}}},{{attr:{{stdDeviation:'0 0'}},duration:{s(OVER)},ease:'power2.out',immediateRender:false}},{s(starts[i])});"]
    # chapter exit: dip before the next card, or fade to ground before the outro
    z += 1
    if last:
        els.append(f'<div id="{cid}-end" class="clip dip" data-layout-allow-occlusion data-start="{s(end - 12)}" data-duration="{round(s(end) - s(end - 12), 6)}" data-track-index="3" style="z-index:{z}"><div class="dipc ground" id="{cid}-endc"></div></div>')
        js.append(f"tl.fromTo('#{cid}-endc',{{opacity:0}},{{opacity:1,duration:{s(10)},ease:'power2.inOut'}},{s(end - 12)});")
    else:
        els.append(f'<div id="{cid}-end" class="clip dip" data-start="{s(end - 3)}" data-duration="{round(s(end) - s(end - 3), 6)}" data-track-index="3" style="z-index:{z}"><div class="dipc" id="{cid}-endc"></div></div>')
        js.append(f"tl.fromTo('#{cid}-endc',{{opacity:0}},{{opacity:0.4,duration:{s(3)},ease:'none'}},{s(end - 3)});")
    doc = (f'<template>\n  <style>{CHAPTER_CSS}  </style>\n'
           f'  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080">\n'
           f'    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{"".join(defs)}</defs></svg>\n    '
           + "\n    ".join(els) +
           f'\n  </div>\n  <script>\n    const tl = gsap.timeline({{ paused: true }});\n    ' + "\n    ".join(js) +
           f'\n    window.__timelines["{cid}"] = tl;\n  </script>\n</template>\n')
    open(os.path.join(ROOT, "compositions", f"{cid}.html"), "w").write(doc)
    return end


CARD_CSS = f"""
    #root{{position:absolute;inset:0;overflow:hidden;background:{GROUND}}}
    .tw{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}}
    .big{{font-family:'League Gothic',sans-serif;font-size:440px;line-height:1;color:#fff;letter-spacing:.02em;margin-top:-90px}}
    .line{{position:absolute;left:0;right:0;top:700px;text-align:center;font:600 56px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92)}}
    .line span{{display:inline-block;margin:0 .14em}}
"""


def words(idp, text):
    return "".join(f'<span id="{idp}-w{k}">{e(w)}</span>' for k, w in enumerate(text.split()))


def word_in(idp, text, t):
    return [f"tl.fromTo('#{idp}-w{k}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},{round(t + k * 0.067, 4)});"
            for k, _ in enumerate(text.split())]


def intro(d):
    l1, l2 = d["lines"]
    js = word_in("intro-l1", l1, 0.6) + [
        f"tl.fromTo('#intro-l1',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:0.15,ease:'power2.in',immediateRender:false}},1.7);"]
    js += word_in("intro-l2", l2, 1.9) + [
        f"tl.fromTo('#intro-l2',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:0.15,ease:'power2.in',immediateRender:false}},2.98);",
        f"tl.fromTo('#intro-tw',{{scale:1}},{{scale:6,duration:0.35,ease:'power3.in',immediateRender:false}},{s(INTRO) - 0.35});"]
    doc = (f'<template>\n  <style>{CARD_CSS}  </style>\n'
           f'  <div id="root" data-composition-id="intro" data-width="1920" data-height="1080">\n'
           f'    <div id="intro-tw" class="tw"><div class="big" id="intro-big">{e(d["title"])}</div></div>\n'
           f'    <div id="intro-l1" class="line clip" data-start="0" data-duration="{s(INTRO)}">{words("intro-l1", l1)}</div>\n'
           f'    <div id="intro-l2" class="line clip" data-start="0" data-duration="{s(INTRO)}">{words("intro-l2", l2)}</div>\n'
           f'  </div>\n  <script>\n    const tl = gsap.timeline({{ paused: true }});\n    ' + "\n    ".join(js) +
           f'\n    window.__timelines["intro"] = tl;\n  </script>\n</template>\n')
    open(os.path.join(ROOT, "compositions", "intro.html"), "w").write(doc)


def outro(d):
    js = [f"tl.fromTo('#outro-big',{{opacity:0,filter:'blur(10px)'}},{{opacity:1,filter:'blur(0px)',duration:0.25,ease:'power4.out'}},0.12);"]
    js += word_in("outro-l", d["line"], 0.6)
    js.append(f"tl.fromTo('#outro-l',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:0.2,ease:'power2.in',immediateRender:false}},{s(OUTRO) - 0.6});")
    doc = (f'<template>\n  <style>{CARD_CSS}  </style>\n'
           f'  <div id="root" data-composition-id="outro" data-width="1920" data-height="1080">\n'
           f'    <div id="outro-tw" class="tw"><div class="big" id="outro-big">{e(d["title"])}</div></div>\n'
           f'    <div id="outro-l" class="line clip" data-start="0" data-duration="{s(OUTRO)}">{words("outro-l", d["line"])}</div>\n'
           f'  </div>\n  <script>\n    const tl = gsap.timeline({{ paused: true }});\n    ' + "\n    ".join(js) +
           f'\n    window.__timelines["outro"] = tl;\n  </script>\n</template>\n')
    open(os.path.join(ROOT, "compositions", "outro.html"), "w").write(doc)


def main():
    d = json.load(open(os.path.join(ROOT, "slides.json")))
    os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
    intro(d["intro"])
    outro(d["outro"])
    hosts, t = [], INTRO
    hosts.append(("intro", 0, INTRO))
    for ci, ch in enumerate(d["chapters"]):
        n = chapter(ch, d.get("credits", {}), ci == len(d["chapters"]) - 1)
        hosts.append((ch["id"], t, n))
        t += n
    hosts.append(("outro", t, OUTRO))
    total = t + OUTRO
    host_html = "\n".join(
        f'      <div id="{h}" data-composition-id="{h}" data-composition-src="compositions/{h}.html" data-start="{s(a)}" '
        f'data-duration="{s(n)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
        for h, a, n in hosts)
    TITLE = e(d.get("title", "Already Here · Projection 2050"))
    index = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>{TITLE}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: {GROUND}; --ink: #ffffff; --accent: {ACCENT}; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 100%; height: 100%; background: var(--ground); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{s(total)}" data-width="1920" data-height="1080">
{host_html}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
    open(os.path.join(ROOT, "index.html"), "w").write(index)
    print("scenes:", [(h, s(a), s(n)) for h, a, n in hosts], "total", s(total), "s,", total, "frames")


if __name__ == "__main__":
    main()
