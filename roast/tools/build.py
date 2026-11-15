"""Write index.html and compositions/*.html for The Roast (see SPEC.md). Static HTML, explicit tweens."""
import html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
GROUND, ACCENT = "#0b0b0d", "#ff5315"
OPEN, EX, SCORE, TURN, RC, RC_LAST, END, OVER = 141, 72, 105, 105, 66, 90, 120, 3

EXHIBITS = [
 ("barrier", "A 1982 river gate. In fog."),
 ("maglev", "The caption admits “since 2004”."),
 ("waymo", "An SUV wearing a bucket."),
 ("eden", "Bubble wrap in Cornwall."),
 ("headset", "A gadget on a shop table."),
 ("frontier", "Server racks. With a logo."),
 ("sequencer", "Two beige printers."),
 ("ingenuity", "Find the helicopter."),
 ("veggie", "The space finale: salad."),
 ("blackhole", "A blurry orange donut."),
 ("torus", "The one radical idea, labelled “Then”."),
]
SCORES = [("15", "cut"), ("6", "demoted"), ("3", "replaced"), ("1", "kept")]
RECUT = ["nif", "mammoth", "aurora", "starship", "moon", "elevator", "elt", "sail", "smiled"]


def s(f):
    return round(f / FPS, 6)


def e(t):
    return html.escape(t, quote=True)


def words(idp, text):
    return "".join(f'<span id="{idp}-w{k}">{e(w)}</span>' for k, w in enumerate(text.split()))


def word_in(idp, text, t, blur=6):
    return [f"tl.fromTo('#{idp}-w{k}',{{opacity:0,filter:'blur({blur}px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},{round(t + k * 0.067, 4)});"
            for k, _ in enumerate(text.split())]


def out(sel, t, d=0.15):
    return f"tl.fromTo('{sel}',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:{d},ease:'power2.in',immediateRender:false}},{round(t, 4)});"


BASE_CSS = f"""
    #root{{position:absolute;inset:0;overflow:hidden;background:{GROUND};font-family:Inter,sans-serif;color:#fff}}
    .line{{position:absolute;left:192px;right:192px;text-align:center;font:600 60px/1.2 Inter,sans-serif}}
    .line span{{display:inline-block;margin:0 .13em}}
    .big{{font-family:'League Gothic',sans-serif;text-transform:uppercase;line-height:.9;letter-spacing:.02em}}
"""


def scene(cid, dur, css, els, js):
    doc = (f'<template>\n  <style>{BASE_CSS}{css}  </style>\n'
           f'  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080">\n    '
           + "\n    ".join(els) +
           f'\n  </div>\n  <script>\n    const tl = gsap.timeline({{ paused: true }});\n    ' + "\n    ".join(js) +
           f'\n    window.__timelines["{cid}"] = tl;\n  </script>\n</template>\n')
    open(os.path.join(ROOT, "compositions", f"{cid}.html"), "w").write(doc)
    return dur


def open_scene():
    l1, l2 = "We made a film about 2050.", "Then we watched it."
    css = """
    .tw{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
    .ttl{font-size:360px;color:#fff}
    .tk{font:800 34px/1.2 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#ff5315}
"""
    els = [f'<div id="open-tw" class="tw clip" data-start="0" data-duration="{s(OPEN)}"><div class="tk">Projection 2050</div><div class="big ttl">The roast</div></div>',
           f'<div id="open-l1" class="line clip" data-start="0" data-duration="{s(OPEN)}" style="top:470px">{words("open-l1", l1)}</div>',
           f'<div id="open-l2" class="line clip" data-start="0" data-duration="{s(OPEN)}" style="top:470px">{words("open-l2", l2)}</div>']
    js = [out("#open-tw", 1.0, 0.2)] + word_in("open-l1", l1, 1.3) + [out("#open-l1", 2.75)] + word_in("open-l2", l2, 2.95) + [out("#open-l2", s(OPEN) - 0.25)]
    return scene("open", OPEN, css, els, js)


def roast_scene():
    css = f"""
    .shot{{position:absolute;inset:0;overflow:hidden;background:#000}}
    .kb{{position:absolute;inset:0}}
    .kb img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}}
    .dim{{position:absolute;inset:0;background:rgba(0,0,0,.22)}}
    .top{{position:absolute;left:0;right:0;top:0;height:58%;background:linear-gradient(to bottom,rgba(0,0,0,.86) 0%,rgba(0,0,0,.6) 45%,rgba(0,0,0,0) 100%)}}
    .rl{{position:absolute;left:192px;top:118px;width:1300px}}
    .ek{{font:800 30px/1.2 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:{ACCENT}}}
    .ek i{{font-style:normal;color:rgba(255,255,255,.7)}}
    .rt{{font-family:'League Gothic',sans-serif;font-size:124px;line-height:.95;text-transform:uppercase;margin-top:10px;text-shadow:0 3px 18px rgba(0,0,0,.55)}}
    .rt span{{display:inline-block;margin-right:.18em}}
    .stamp{{position:absolute;right:210px;top:330px;text-transform:uppercase;font-family:'League Gothic',sans-serif;font-size:210px;line-height:1;letter-spacing:.05em;padding:6px 40px 0;border:12px solid {ACCENT};color:{ACCENT};background:rgba(11,11,13,.35);border-radius:14px}}
    .stamp.keep{{border-color:#fff;color:#0b0b0d;background:#fff}}
"""
    els, js = [], []
    n = len(EXHIBITS)
    for i, (key, line) in enumerate(EXHIBITS):
        a = i * EX
        base = f"ex{i}"
        keep = i == n - 1
        els.append(f'<div id="{base}" class="clip shot" data-start="{s(a)}" data-duration="{s(EX)}" data-track-index="1" style="z-index:{i + 1}">'
                   f'<div class="kb" id="{base}-kb"><img src="assets/v1/{key}.jpg" alt="v1 slide: {key}"></div><div class="dim"></div><div class="top"></div>'
                   f'<div class="rl"><div class="ek" id="{base}-k">Exhibit {i + 1:02d}<i> · Already Here, v1</i></div><div class="rt" id="{base}-t">{words(base + "-t", line)}</div></div>'
                   f'<div class="stamp{" keep" if keep else ""}" id="{base}-st">{"Keep" if keep else "Cut"}</div></div>')
        t0 = s(a)
        js += [f"tl.fromTo('#{base}-kb',{{scale:1.05}},{{scale:1,duration:0.3,ease:'expo.out'}},{t0});",
               f"tl.fromTo('#{base}-kb',{{scale:1}},{{scale:1.035,duration:{round(s(EX) - 0.3, 4)},ease:'none',immediateRender:false}},{round(t0 + 0.3, 4)});",
               f"tl.fromTo('#{base}-k',{{opacity:0}},{{opacity:1,duration:0.15,ease:'power2.out'}},{round(t0 + 0.2, 4)});"]
        js += word_in(base + "-t", line, t0 + 0.35)
        ts = round(t0 + 1.1, 4)
        js += [f"tl.fromTo('#{base}-st',{{opacity:0,scale:2.4,rotation:-14}},{{opacity:1,scale:1,rotation:-8,duration:0.14,ease:'power4.in'}},{ts});",
               f"tl.fromTo('#{base}-kb',{{x:-14}},{{x:0,duration:0.35,ease:'elastic.out(1,0.3)',immediateRender:false}},{round(ts + 0.14, 4)});"]
    return scene("roast", n * EX, css, els, js)


def score_scene():
    css = """
    .row{position:absolute;left:192px;right:192px;top:300px;display:flex;justify-content:space-between}
    .sc{display:flex;flex-direction:column;align-items:center;width:340px}
    .sc b{font-family:'League Gothic',sans-serif;font-weight:400;font-size:300px;line-height:.9}
    .sc span{font:700 36px/1.2 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-top:8px}
    .sc.hi b{color:#ff5315}
"""
    cells = "".join(f'<div class="sc{" hi" if k == 0 else ""}" id="sc{k}"><b>{e(nm)}</b><span>{e(lb)}</span></div>' for k, (nm, lb) in enumerate(SCORES))
    els = [f'<div id="score-row" class="row clip" data-start="0" data-duration="{s(SCORE)}">{cells}</div>']
    js = [f"tl.fromTo('#sc{k}',{{opacity:0,y:30,filter:'blur(8px)'}},{{opacity:1,y:0,filter:'blur(0px)',duration:0.2,ease:'power4.out'}},{round(0.2 + k * 0.4, 4)});" for k in range(len(SCORES))]
    js.append(out("#score-row", s(SCORE) - 0.3, 0.2))
    return scene("score", SCORE, css, els, js)


def turn_scene():
    l1, l2 = "The future isn’t what already exists.", "It’s what’s next."
    css = """
    .tw{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .ttl{font-size:420px;color:#fff}
"""
    els = [f'<div id="turn-l1" class="line clip" data-start="0" data-duration="{s(TURN)}" style="top:470px">{words("turn-l1", l1)}</div>',
           f'<div id="turn-l2" class="line clip" data-start="0" data-duration="{s(TURN)}" style="top:470px;color:#ff5315">{words("turn-l2", l2)}</div>',
           f'<div id="turn-tw" class="tw clip" data-start="0" data-duration="{s(TURN)}"><div class="big ttl" id="turn-t">Further</div></div>']
    js = word_in("turn-l1", l1, 0.15) + [out("#turn-l1", 1.45)] + word_in("turn-l2", l2, 1.6) + [out("#turn-l2", 2.45)]
    js += [f"tl.fromTo('#turn-t',{{opacity:0,filter:'blur(12px)'}},{{opacity:1,filter:'blur(0px)',duration:0.2,ease:'power4.out'}},2.6);",
           f"tl.fromTo('#turn-tw',{{scale:1}},{{scale:6,duration:0.35,ease:'power3.in',immediateRender:false}},{s(TURN) - 0.35});"]
    return scene("turn", TURN, css, els, js)


def recut_scene():
    css = """
    .shot{position:absolute;inset:0;overflow:hidden}
    .mv,.kb{position:absolute;inset:0}
    .kb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
"""
    els, js, defs, starts, f = [], [], [], [], 0
    for k in RECUT:
        starts.append(f)
        f += RC_LAST if k == RECUT[-1] else RC
    end = f
    n = len(RECUT)
    sign = -1
    for i, key in enumerate(RECUT):
        base = f"rc{i}"
        a = starts[i] - (OVER if i else 0)
        b = (starts[i + 1] + OVER) if i < n - 1 else end
        defs.append(f'<filter id="{base}-mb" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur id="{base}-fb" stdDeviation="0 0"/></filter>')
        els.append(f'<div id="{base}" class="clip shot" data-start="{s(a)}" data-duration="{round(s(b) - s(a), 6)}" data-track-index="1" style="z-index:{i + 1}">'
                   f'<div class="mv" id="{base}-mv" style="filter:url(#{base}-mb)"><div class="kb" id="{base}-kb"><img src="assets/v2/{key}.jpg" alt="v2 slide: {key}"></div></div></div>')
        js.append(f"tl.fromTo('#{base}-kb',{{scale:1}},{{scale:1.04,duration:{round(s(b) - s(a), 4)},ease:'none'}},{s(a)});")
        if i == 0:
            continue
        t0, prev = s(starts[i] - OVER), f"rc{i - 1}"
        if i % 2:  # zoom-through
            js += [f"tl.fromTo('#{prev}-mv',{{scale:1}},{{scale:1.35,duration:{s(2 * OVER)},ease:'power2.in',immediateRender:false}},{t0});",
                   f"tl.fromTo('#{base}-mv',{{scale:1.3,opacity:0}},{{scale:1,opacity:1,duration:{s(2 * OVER)},ease:'power3.out'}},{t0});",
                   f"tl.fromTo('#{base}-fb',{{attr:{{stdDeviation:'16 16'}}}},{{attr:{{stdDeviation:'0 0'}},duration:{s(2 * OVER)},ease:'power2.out'}},{t0});"]
        else:  # whip, alternating direction
            sign = -sign
            js += [f"tl.fromTo('#{prev}-mv',{{xPercent:0}},{{xPercent:{sign * 100},duration:{s(2 * OVER)},ease:'power2.inOut',immediateRender:false}},{t0});",
                   f"tl.fromTo('#{base}-mv',{{xPercent:{-sign * 100}}},{{xPercent:0,duration:{s(2 * OVER)},ease:'power2.inOut'}},{t0});"]
            for fb in (f"#{prev}-fb", f"#{base}-fb"):
                js += [f"tl.fromTo('{fb}',{{attr:{{stdDeviation:'0 0'}}}},{{attr:{{stdDeviation:'40 0'}},duration:{s(OVER)},ease:'power2.in',immediateRender:false}},{t0});",
                       f"tl.fromTo('{fb}',{{attr:{{stdDeviation:'40 0'}}}},{{attr:{{stdDeviation:'0 0'}},duration:{s(OVER)},ease:'power2.out',immediateRender:false}},{s(starts[i])});"]
    els.insert(0, f'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{"".join(defs)}</defs></svg>')
    scene("recut", end, css, els, js)
    return end, starts


def end_scene():
    css = """
    .stack{position:absolute;left:192px;right:192px;top:250px;display:flex;flex-direction:column;align-items:center;gap:22px;text-align:center}
    .ttl{font-size:330px;color:#fff}
    .sub{font:700 34px/1.2 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#ff5315}
    .st{font:500 34px/1.3 Inter,sans-serif;color:rgba(255,255,255,.8)}
    .q{font:600 54px/1.2 Inter,sans-serif;margin-top:18px}
"""
    els = [f'<div id="end-stack" class="stack clip" data-start="0" data-duration="{s(END)}">'
           f'<div class="big ttl" id="end-t">Further</div><div class="sub" id="end-s">Projection 2050 · the wall film, recut</div>'
           f'<div class="st" id="end-n">16 bold claims · 37 free images · a 75-second loop</div><div class="q" id="end-q">Which one will you build?</div></div>']
    js = [f"tl.fromTo('#end-t',{{opacity:0,filter:'blur(12px)',scale:1.08}},{{opacity:1,filter:'blur(0px)',scale:1,duration:0.3,ease:'power4.out'}},0.1);",
          f"tl.fromTo('#end-s',{{opacity:0}},{{opacity:1,duration:0.2,ease:'power2.out'}},0.5);",
          f"tl.fromTo('#end-n',{{opacity:0}},{{opacity:1,duration:0.2,ease:'power2.out'}},0.8);",
          f"tl.fromTo('#end-q',{{opacity:0,y:16}},{{opacity:1,y:0,duration:0.25,ease:'power3.out'}},1.4);"]
    return scene("end", END, css, els, js)


TRACK = {"impact-bass-1": 9, "impact-bass-2": 9, "chime": 10, "click-soft": 11, "riser": 12, "whoosh-cinematic": 13, "whoosh-short": 13}


def audio(id_, src, at, dur, vol, fade_out=0.0, fade_in=0.0):
    extra = (f' data-fade-out="{fade_out}"' if fade_out else "") + (f' data-fade-in="{fade_in}"' if fade_in else "")
    return (f'      <audio id="{id_}" src="assets/sfx/{src}.mp3" data-start="{round(at, 4)}" data-duration="{round(dur, 4)}" '
            f'data-volume="{vol}"{extra} data-track-index="{TRACK.get(src, 14)}"></audio>')


def main():
    os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
    t = 0
    hosts, sfx = [], []
    hosts.append(("open", t, open_scene())); t0_open = t; t += OPEN
    sfx += [audio("a-open-1", "click-soft", 1.3, 0.36, 0.6), audio("a-open-2", "click-soft", 2.95, 0.36, 0.6)]
    hosts.append(("roast", t, roast_scene()))
    for i in range(len(EXHIBITS)):
        at = s(t + i * EX) + 1.24
        if i == len(EXHIBITS) - 1:
            sfx.append(audio(f"a-stamp-{i}", "chime", at, 2.0, 1.0, fade_out=0.6))
        else:
            sfx.append(audio(f"a-stamp-{i}", "impact-bass-1" if i % 2 == 0 else "impact-bass-2", at, 1.3, 0.2, fade_out=0.5))
    t += len(EXHIBITS) * EX
    hosts.append(("score", t, score_scene()))
    sfx += [audio(f"a-score-{k}", "click-soft", s(t) + 0.2 + k * 0.4, 0.36, 0.8) for k in range(len(SCORES))]
    t += SCORE
    hosts.append(("turn", t, turn_scene()))
    sfx += [audio("a-riser", "riser", s(t) + 0.4, 2.3, 0.8, fade_out=0.15, fade_in=0.6),
            audio("a-whoosh-big", "whoosh-cinematic", s(t) + 2.95, 2.4, 0.7, fade_out=0.8)]
    t += TURN
    end_rc, starts = recut_scene()
    hosts.append(("recut", t, end_rc))
    sfx += [audio(f"a-rc-{i}", "whoosh-short", s(t + st - OVER) - 0.05, 0.57, 0.4) for i, st in enumerate(starts) if i]
    t += end_rc
    hosts.append(("end", t, end_scene()))
    sfx.append(audio("a-end", "impact-bass-2", s(t) + 0.1, 2.0, 0.15, fade_out=0.8))
    t += END
    host_html = "\n".join(
        f'      <div id="{h}" data-composition-id="{h}" data-composition-src="compositions/{h}.html" data-start="{s(a)}" '
        f'data-duration="{s(n)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
        for h, a, n in hosts)
    index = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>The Roast · Projection 2050</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: {GROUND}; --ink: #ffffff; --accent: {ACCENT}; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 100%; height: 100%; background: var(--ground); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{s(t)}" data-width="1920" data-height="1080">
{host_html}
{chr(10).join(sfx)}
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
    print("scenes:", [(h, s(a), s(n)) for h, a, n in hosts], "total", s(t), "s")


if __name__ == "__main__":
    main()
