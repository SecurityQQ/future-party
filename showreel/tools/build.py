"""Write index.html and compositions/*.html from reel.json (static HTML, explicit tweens).

    python3 -I tools/build.py

The film is cut on the score: reel.json holds the downbeat of every bar, a section is two bars,
a chapter is four sections. Every quote is checked against books/quotes.json and every tweet
against tweets/tweets.json before anything is written, so the words on screen stay verbatim.
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
REEL = json.load(open(os.path.join(ROOT, "reel.json")))
BARS = REEL["bars"]
FPS = 30
GROUND, ACCENT = "#0b0b0d", "#ff5315"
NAMES = {"F": "fact", "Q": "quote", "T": "tweet", "P": "slides"}


def r(t):
    return round(t, 4)


def e(t):
    return html.escape(t, quote=True)


# ---------- the words on screen are checked against the repo's verified sources ----------

def norm(s):
    return re.sub(r"\s+", " ", s.replace("…", "").strip())


def verify():
    quotes = json.load(open(os.path.join(REPO, "books", "quotes.json")))
    tw = json.load(open(os.path.join(REPO, "tweets", "tweets.json")))
    by_id = {t["id"]: t for t in tw["tweets"]}
    for ch in REEL["chapters"]:
        q = ch["quote"]
        if not any(x["b"] == q["b"] and norm(q["q"]) in norm(x["q"]) for x in quotes):
            raise SystemExit(f"{ch['id']}: quote is not word for word in books/quotes.json: {q['q']}")
        t = ch["tweet"]
        src = by_id[t["id"]]
        parts = t["text"] if isinstance(t["text"], list) else [t["text"]]
        for part in parts:  # an excerpt, or several joined by an ellipsis: each must be in the tweet word for word
            if norm(part) not in norm(src["text"]):
                raise SystemExit(f"{ch['id']}: tweet text is not word for word in tweets/tweets.json: {part}")
        t["text"] = "… ".join(parts)
        a = tw["authors"][src["h"]]
        t.update(handle=a["h"], name=a["name"], role=a["role"], date=src["date"])
        if src["h"] != t["h"]:
            raise SystemExit(f"{ch['id']}: tweet {t['id']} is by {src['h']}, not {t['h']}")


# ---------- shared styles ----------

CSS = f"""
    @font-face{{font-family:'Instrument Serif';font-style:normal;font-weight:400;src:url('assets/fonts/InstrumentSerif-Regular.woff2') format('woff2')}}
    #root{{position:absolute;inset:0;overflow:hidden;background:{GROUND};font-family:Inter,sans-serif;color:#fff}}
    .stage{{position:absolute;inset:0;overflow:hidden}}
    .mv{{position:absolute;inset:0}}
    video.fill{{position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover;display:block}}
    .scrim{{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,.8) 0%,rgba(0,0,0,.62) 36%,rgba(0,0,0,.18) 66%,rgba(0,0,0,0) 84%),linear-gradient(to bottom,rgba(0,0,0,0) 46%,rgba(0,0,0,.6) 100%)}}
    .scrim.soft{{background:linear-gradient(to right,rgba(0,0,0,.62) 0%,rgba(0,0,0,.4) 40%,rgba(0,0,0,0) 72%)}}
    .dim{{position:absolute;inset:0;background:rgba(11,11,13,.6)}}
    .dim.deep{{background:rgba(11,11,13,.74)}}
    .dip{{position:absolute;inset:0}}
    .dipc{{position:absolute;inset:0;background:#000}}
    .cap{{position:absolute;left:192px;width:1536px;text-shadow:0 2px 16px rgba(0,0,0,.55)}}
    .cap.low{{bottom:112px}}
    .cap.mid{{top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}}
    .kick{{font:800 34px/1.15 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:{ACCENT}}}
    .kick.plain{{text-transform:none;letter-spacing:.04em}}
    .num{{font-family:'League Gothic',sans-serif;font-size:300px;line-height:.86;letter-spacing:.01em;text-transform:uppercase;margin-top:10px;white-space:nowrap}}
    .num span{{display:inline-block}}
    .num small{{display:inline-block;font-size:.42em;margin:0 .22em;color:rgba(255,255,255,.66);text-transform:lowercase;vertical-align:.06em}}
    .num small.unit{{font-size:.5em;margin:0 0 0 .14em;color:#fff;text-transform:none;vertical-align:0}}
    .ftxt{{font:600 46px/1.22 Inter,sans-serif;margin-top:22px;max-width:1160px}}
    .ftxt span,.qtxt span{{display:inline-block}}
    .fsrc{{font:500 28px/1.2 Inter,sans-serif;color:rgba(255,255,255,.72);margin-top:20px}}
    .qtxt{{font-family:'Instrument Serif',serif;font-size:104px;line-height:1.05;letter-spacing:-.005em;margin-top:26px;max-width:1500px}}
    .qtxt.long{{font-size:92px}}
    .qby{{font:600 34px/1.25 Inter,sans-serif;color:rgba(255,255,255,.86);margin-top:34px}}
    .thead{{display:flex;align-items:center;gap:30px}}
    .tav{{width:128px;height:128px;border-radius:50%;object-fit:cover;display:block}}
    .tname{{font:800 50px/1.1 Inter,sans-serif}}
    .trole{{font:500 32px/1.2 Inter,sans-serif;color:rgba(255,255,255,.74);margin-top:8px}}
    .ttxt{{font:600 70px/1.16 Inter,sans-serif;margin-top:40px;max-width:1500px;font-feature-settings:'calt' 0}}
    .ttxt.long{{font-size:60px}}
    .tcap .kick{{margin-top:36px}}
"""


def page(cid, body, js, extra_css=""):
    return f"""<template>
  <style>{CSS}{extra_css}  </style>
  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080">
{body}
  </div>
  <script>
    (function () {{
      const tl = gsap.timeline({{ paused: true }});
{js}
      window.__timelines["{cid}"] = tl;
    }})();
  </script>
</template>
"""


def video(vid, src, st, du, lane=1):
    return (f'<video id="{vid}" class="clip fill" src="{src}" muted playsinline data-hf-media-start-basis="local" data-start="{r(st)}" '
            f'data-duration="{r(du)}" data-track-index="{lane}"></video>')


def words(base, text, lq="", rq=""):
    ws = text.split()
    out = []
    for k, w in enumerate(ws):
        w = (lq if k == 0 else "") + w + (rq if k == len(ws) - 1 else "")
        out.append(f'<span id="{base}-w{k}">{e(w)}</span>')
    return " ".join(out), len(ws)


def exit_cap(sel, end):
    return (f"      tl.fromTo('{sel}',{{opacity:1,filter:'blur(0px)'}},{{opacity:0,filter:'blur(8px)',duration:0.15,"
            f"ease:'power2.in',immediateRender:false}},{r(end - 0.22)});")


# ---------- seams: every cut lands on a bar, at the fastest frame of a move ----------

def seam_out(kind, stage, end, sign):
    if kind == "zoom":
        return [f"      tl.fromTo('{stage}',{{scale:1}},{{scale:1.3,duration:0.17,ease:'power3.in',immediateRender:false}},{r(end - 0.17)});"]
    if kind == "push":  # both shots travel together for 8 frames around the bar, so no ground shows between them
        return [f"      tl.fromTo('{stage}',{{xPercent:0}},{{xPercent:{-sign * 100},duration:{r(2 * OV)},ease:'power2.inOut',immediateRender:false}},{r(end - OV)});"]
    return []


def seam_in(kind, stage, start, sign):
    if kind == "zoom":
        return [f"      tl.fromTo('{stage}',{{scale:1.24}},{{scale:1,duration:0.32,ease:'power3.out'}},{r(start)});"]
    if kind == "push":
        return [f"      tl.fromTo('{stage}',{{xPercent:{sign * 100}}},{{xPercent:0,duration:{r(2 * OV)},ease:'power2.inOut'}},{r(start - OV)});"]
    if kind == "dip":
        return [f"      tl.fromTo('{stage}',{{scale:1.045}},{{scale:1,duration:0.45,ease:'expo.out'}},{r(start)});"]
    return []


IN_KIND = {"Q": "zoom", "T": "dip", "P": "push"}
OV = 4 / FPS  # how long a pushed shot stays on past its bar, and how early the next one starts


# ---------- the four kinds of section ----------

def fact(cid, n, f, a, mid, end, z, pre=0, post=0):
    b = f"{cid}-f"
    els, js = [], []
    num = f["num"]
    if f.get("parts"):
        p = f["parts"]
        numhtml = f'<span id="{b}-n0">{e(p[0])}</span><small id="{b}-n1">{e(p[1])}</small><span id="{b}-n2">{e(p[2])}</span>'
    elif f.get("count"):
        c = f["count"]
        numhtml = f'<span id="{b}-n0">{c["to"]}{e(c["suffix"])}</span>'
        if f.get("unit"):
            numhtml += f'<small class="unit">{e(f["unit"])}</small>'
    else:
        numhtml = f'<span id="{b}-n0">{e(num)}</span>'
    txt, nw = words(f"{b}", f["text"])
    els.append(
        f'    <div class="stage" id="{b}-st" style="z-index:{z}">\n'
        f'      <div class="mv" id="{b}-a-mv">{video(f"{b}-a", "assets/footage/" + f["shots"][0] + ".mp4", a - pre, mid - a + pre)}</div>\n'
        f'      <div class="mv" id="{b}-b-mv">{video(f"{b}-b", "assets/footage/" + f["shots"][1] + ".mp4", mid, end - mid + post)}</div>\n'
        f'      <div id="{b}-scrim" class="clip scrim" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="2"></div>\n'
        f'      <div id="{b}-cap" class="clip cap low" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="3">\n'
        f'        <div id="{b}-in"><div class="kick" id="{b}-k">Fact {n} / 6</div>\n'
        f'        <div class="num" id="{b}-num">{numhtml}</div>\n'
        f'        <div class="ftxt" id="{b}-t">{txt}</div>\n'
        f'        <div class="fsrc" id="{b}-s">{e(f["src"])}</div></div>\n'
        f'      </div>\n'
        f'    </div>')
    # the number is on screen with the cut; the footage lands under it
    js.append(f"      tl.fromTo('#{b}-a-mv',{{scale:1.1}},{{scale:1,duration:0.55,ease:'expo.out'}},{r(a)});")
    js.append(f"      tl.fromTo('#{b}-b-mv',{{scale:1.06}},{{scale:1,duration:0.45,ease:'expo.out'}},{r(mid)});")
    js.append(f"      tl.fromTo('#{b}-k',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.17,ease:'power4.out'}},{r(a + 0.06)});")
    if f.get("count"):
        c = f["count"]
        js.append(f"      (function(){{const o={{v:{c['from']}}},el=document.getElementById('{b}-n0');"
                  f"tl.fromTo(o,{{v:{c['from']}}},{{v:{c['to']},duration:1.2,ease:'power2.out',"
                  f"onUpdate:function(){{el.textContent=Math.round(o.v)+{json.dumps(c['suffix'])};}}}},{r(a)});}})();")
    if f.get("parts"):
        beat = (mid - a) / 4
        js.append(f"      tl.fromTo('#{b}-n1',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.15,ease:'power4.out'}},{r(a + beat - 0.05)});")
        js.append(f"      tl.set('#{b}-n2',{{opacity:0}},0);")
        js.append(f"      tl.set('#{b}-n2',{{opacity:1}},{r(a + 2 * beat)});")
        js.append(f"      tl.fromTo('#{b}-n2',{{scale:1.16}},{{scale:1,duration:0.3,ease:'expo.out',immediateRender:false}},{r(a + 2 * beat)});")
    for k in range(nw):
        js.append(f"      tl.fromTo('#{b}-w{k}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},{r(a + 0.22 + k * 0.036)});")
    js.append(f"      tl.fromTo('#{b}-s',{{opacity:0}},{{opacity:1,duration:0.25,ease:'power2.out'}},{r(a + 0.38 + nw * 0.036)});")
    js.append(exit_cap(f"#{b}-in", end))
    return els, js, f"#{b}-st"


def quote(cid, q, a, end, z, pre=0, post=0):
    b = f"{cid}-q"
    txt, nw = words(b, q["q"], "“", "”")
    long = " long" if len(q["q"]) > 84 else ""
    els = [
        f'    <div class="stage" id="{b}-st" style="z-index:{z}">\n'
        f'      <div class="mv" id="{b}-mv">{video(f"{b}-bg", "assets/footage/" + q["bg"] + ".mp4", a - pre, end - a + pre + post)}</div>\n'
        f'      <div id="{b}-dim" class="clip dim" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="2"></div>\n'
        f'      <div id="{b}-cap" class="clip cap mid" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="3">\n'
        f'        <div id="{b}-in"><div class="kick" id="{b}-k">{e(q["book"])} · {q["year"]}</div>\n'
        f'        <div class="qtxt{long}" id="{b}-t">{txt}</div>\n'
        f'        <div class="qby" id="{b}-b">{e(q["by"])}</div></div>\n'
        f'      </div>\n'
        f'    </div>']
    js = [f"      tl.fromTo('#{b}-mv',{{scale:1}},{{scale:1.07,duration:{r(end - a)},ease:'none'}},{r(a)});",
          f"      tl.fromTo('#{b}-k',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.17,ease:'power4.out'}},{r(a + 0.1)});"]
    step = min(0.075, 1.5 / nw)
    for k in range(nw):  # each word turns from grey to ink, no move
        js.append(f"      tl.fromTo('#{b}-w{k}',{{opacity:0.24}},{{opacity:1,duration:0.2,ease:'power2.out'}},{r(a + 0.3 + k * step)});")
    js.append(f"      tl.fromTo('#{b}-b',{{opacity:0}},{{opacity:1,duration:0.25,ease:'power2.out'}},{r(a + 0.45 + nw * step)});")
    js.append(exit_cap(f"#{b}-in", end))
    return els, js, f"#{b}-st"


def tweet(cid, t, a, end, z, pre=0, post=0):
    b = f"{cid}-t"
    long = " long" if len(t["text"]) > 120 else ""
    els = [
        f'    <div class="stage" id="{b}-st" style="z-index:{z}">\n'
        f'      <div class="mv" id="{b}-mv">{video(f"{b}-bg", "assets/footage/" + t["bg"] + ".mp4", a - pre, end - a + pre + post)}</div>\n'
        f'      <div id="{b}-dim" class="clip dim deep" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="2"></div>\n'
        f'      <div id="{b}-cap" class="clip cap mid tcap" data-start="{r(a - pre)}" data-duration="{r(end - a + pre + post)}" data-track-index="3">\n'
        f'        <div id="{b}-in"><div class="thead"><div id="{b}-av"><img class="tav" src="assets/avatars/{t["h"]}.jpg" alt=""></div>'
        f'<div id="{b}-who"><div class="tname">{e(t["name"])}</div><div class="trole">{e(t["role"])}</div></div></div>\n'
        f'        <div class="ttxt{long}" id="{b}-x">{e(t["text"])}</div>\n'
        f'        <div class="kick plain" id="{b}-k">@{e(t["handle"])} on X · {e(t["date"])}</div></div>\n'
        f'      </div>\n'
        f'    </div>']
    js = [f"      tl.fromTo('#{b}-mv',{{scale:1.07}},{{scale:1,duration:{r(end - a)},ease:'none'}},{r(a)});",
          f"      tl.fromTo('#{b}-av',{{scale:0.6,opacity:0}},{{scale:1,opacity:1,duration:0.38,ease:'back.out(1.6)'}},{r(a + 0.04)});",
          f"      tl.fromTo('#{b}-who',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:0.18,ease:'power4.out'}},{r(a + 0.14)});",
          f"      tl.fromTo('#{b}-x',{{opacity:0,filter:'blur(10px)'}},{{opacity:1,filter:'blur(0px)',duration:0.22,ease:'power4.out'}},{r(a + 0.3)});",
          f"      tl.fromTo('#{b}-k',{{opacity:0}},{{opacity:1,duration:0.25,ease:'power2.out'}},{r(a + 0.6)});",
          exit_cap(f"#{b}-in", end)]
    return els, js, f"#{b}-st"


def slide(cid, k, key, a, end, z, pre=0, post=0):
    b = f"{cid}-p{k}"
    els = [f'    <div class="stage" id="{b}-st" data-layout-allow-overflow style="z-index:{z}">{video(b, "assets/further/" + key + ".mp4", a - pre, end - a + pre + post)}</div>']
    return els, [], f"#{b}-st"


# ---------- scenes ----------

def chapter(i, ch):
    cid = ch["id"]
    s = 2 + 8 * i
    t0 = BARS[s]
    b = [BARS[s + k] - t0 for k in range(9)]
    sign = 1 if i % 2 == 0 else -1
    plan = []  # (kind, start, middle, end, slide number)
    for j, kind in enumerate(ch["order"]):
        a, mid, end = b[2 * j], b[2 * j + 1], b[2 * j + 2]
        plan += [("P", a, mid, mid, 1), ("P", mid, end, end, 2)] if kind == "P" else [(kind, a, mid, end, 0)]
    how = [None] + [IN_KIND[p[0]] for p in plan[1:]]  # how each section comes in; the first one is a hard cut
    els, js, parts = [], [], []
    for k, (kind, a, mid, end, n) in enumerate(plan):
        pre = OV if how[k] == "push" else 0
        post = OV if k + 1 < len(plan) and how[k + 1] == "push" else 0
        z = k + 1
        if kind == "F":
            x, y, st = fact(cid, i + 1, ch["fact"], a, mid, end, z, pre, post)
        elif kind == "Q":
            x, y, st = quote(cid, ch["quote"], a, end, z, pre, post)
        elif kind == "T":
            x, y, st = tweet(cid, ch["tweet"], a, end, z, pre, post)
        else:
            x, y, st = slide(cid, n, ch["slides"][n - 1], a, end, z, pre, post)
        els += x
        js += y
        parts.append((kind, st, a, end))
    for k in range(1, len(parts)):
        kind, st, a, _ = parts[k]
        _, pst, _, pend = parts[k - 1]
        if how[k] == "dip":
            els.append(f'    <div id="{cid}-dip{k}" class="clip dip" data-layout-allow-occlusion data-start="{r(pend - 0.1)}" data-duration="0.1" '
                       f'data-track-index="4" style="z-index:{len(parts) + 5}"><div class="dipc" id="{cid}-dipc{k}"></div></div>')
            js.append(f"      tl.fromTo('#{cid}-dipc{k}',{{opacity:0}},{{opacity:0.42,duration:0.1,ease:'none'}},{r(pend - 0.1)});")
        js += seam_out(how[k], pst, pend, sign) + seam_in(how[k], st, a, sign)
    dur = b[8]
    return cid, r(t0), r(dur), page(cid, "\n".join(els), "\n".join(js)), parts


def intro():
    it = REEL["intro"]
    dur = BARS[2]
    lines = "".join(f'<div id="intro-l{k}">{e(l)}</div>' for k, l in enumerate(it["title"]))
    body = (
        f'    <div class="stage" id="intro-st">\n'
        f'      <div class="mv" id="intro-mv">{video("intro-v", "assets/footage/" + it["shot"] + ".mp4", 0, dur)}</div>\n'
        f'      <div id="intro-scrim" class="clip scrim soft" data-start="0" data-duration="{r(dur)}" data-track-index="2"></div>\n'
        f'      <div id="intro-cap" class="clip cap low" data-start="0" data-duration="{r(dur)}" data-track-index="3">\n'
        f'        <div id="intro-in"><div class="kick" id="intro-k">{e(it["kicker"])}</div>\n'
        f'        <div class="ttl" id="intro-t">{lines}</div>\n'
        f'        <div class="sub" id="intro-s">{e(it["sub"])}</div></div>\n'
        f'      </div>\n'
        f'    </div>')
    css = (".ttl{font-family:'League Gothic',sans-serif;font-size:164px;line-height:.9;letter-spacing:.01em;text-transform:uppercase;margin-top:14px}\n"
           "    .sub{font:600 40px/1.25 Inter,sans-serif;color:rgba(255,255,255,.9);margin-top:26px}\n")
    js = [f"      tl.fromTo('#intro-mv',{{scale:1}},{{scale:1.06,duration:{r(dur)},ease:'none'}},0);",
          # the title is on screen at frame 0 (the thumbnail); only the last line of copy arrives
          "      tl.fromTo('#intro-s',{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:0.2,ease:'power4.out'},1.0);",
          exit_cap("#intro-in", dur - 0.04)]
    js += seam_out("zoom", "#intro-st", dur, 1)
    return "intro", 0, r(dur), page("intro", body, "\n".join(js), css)


def finale():
    fi = REEL["finale"]
    t0 = BARS[50]
    dur = REEL["duration"] - t0
    hold = 3.8  # the last Further slide, with its own caption exit and fade to the ground
    a = hold - 0.15
    credits = "".join(f"<div>{e(c)}</div>" for c in fi["credits"])
    body = (
        f'    <div class="stage" id="finale-p-st" style="z-index:1">{video("finale-p", "assets/further/" + fi["slide"] + ".mp4", 0, hold)}</div>\n'
        f'    <div class="stage" id="finale-e-st" style="z-index:2">\n'
        f'      <div class="mv" id="finale-mv">{video("finale-v", "assets/footage/" + fi["shot"] + ".mp4", a, dur - a)}</div>\n'
        f'      <div id="finale-dim" class="clip dimx" data-start="{r(a)}" data-duration="{r(dur - a)}" data-track-index="2"><div class="dimc" id="finale-dimc"></div></div>\n'
        f'      <div id="finale-foot" class="clip foot" data-start="{r(a)}" data-duration="{r(dur - a)}" data-track-index="2"></div>\n'
        f'      <div id="finale-card" class="clip card" data-start="{r(a)}" data-duration="{r(dur - a)}" data-track-index="3">\n'
        f'        <div class="big" id="finale-big">{e(fi["big"])}</div>\n'
        f'        <div class="line" id="finale-line">{words("finale", fi["line"])[0]}</div>\n'
        f'        <div class="cred" id="finale-cred" data-layout-ignore>{credits}</div>\n'
        f'      </div>\n'
        f'    </div>')
    css = (f"    .dimx{{position:absolute;inset:0}}\n    .dimc{{position:absolute;inset:0;background:{GROUND}}}\n"
           "    .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-shadow:0 2px 18px rgba(0,0,0,.6)}\n"
           "    .big{font-family:'League Gothic',sans-serif;font-size:340px;line-height:.86;letter-spacing:.01em}\n"
           "    .line{font:600 50px/1.2 Inter,sans-serif;margin-top:26px}\n    .line span{display:inline-block}\n"
           "    .cred{position:absolute;left:0;right:0;bottom:112px;text-align:center;font:500 28px/1.5 Inter,sans-serif;color:rgba(255,255,255,.86)}\n"
           "    .foot{position:absolute;left:0;right:0;bottom:0;height:42%;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,.7) 100%)}\n")
    nw = len(fi["line"].split())
    js = [f"      tl.fromTo('#finale-dimc',{{opacity:1}},{{opacity:0.68,duration:0.9,ease:'power2.out'}},{r(a)});",
          f"      tl.fromTo('#finale-mv',{{scale:1.08}},{{scale:1,duration:{r(dur - a)},ease:'none'}},{r(a)});",
          f"      tl.fromTo('#finale-big',{{opacity:0,filter:'blur(12px)'}},{{opacity:1,filter:'blur(0px)',duration:0.2,ease:'power4.out'}},{r(a + 0.25)});"]
    for k in range(nw):
        js.append(f"      tl.fromTo('#finale-w{k}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:0.13,ease:'power4.out'}},{r(a + 0.75 + k * 0.08)});")
    js.append(f"      tl.fromTo('#finale-cred',{{opacity:0}},{{opacity:1,duration:0.4,ease:'power2.out'}},{r(a + 1.7)});")
    return "finale", r(t0), r(dur), page("finale", body, "\n".join(js), css)


# ---------- CREDITS.md: every fragment, quote and tweet with its source ----------

def credits():
    foot = json.load(open(os.path.join(ROOT, "footage.json")))
    used = [REEL["intro"]["shot"], REEL["finale"]["shot"]]
    where = {REEL["intro"]["shot"]: "title", REEL["finale"]["shot"]: "end card"}
    for i, ch in enumerate(REEL["chapters"]):
        for sid, role in ((ch["fact"]["shots"][0], "fact"), (ch["fact"]["shots"][1], "fact"), (ch["quote"]["bg"], "quote"), (ch["tweet"]["bg"], "tweet")):
            used.append(sid)
            where[sid] = f"{i + 1} / 6, {role}"
    shots = {x["id"]: x for x in foot["shots"]}
    m = REEL["music"]
    out = ["# Credits: Six Facts (the show reel)", "",
           "Written by `tools/build.py` from `footage.json` and `reel.json`. Do not edit by hand.", "",
           "## Footage", "",
           "Every fragment is NASA footage, which is not copyrighted in the United States and is free to reuse with credit "
           "([NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)). NASA does not endorse this film. "
           "`tools/fetch_footage.py` downloads only the seconds listed here.", "",
           "| Shot | Where | What it shows | Source | Credit | From | Speed |", "|---|---|---|---|---|---|---|"]
    for sid in used:
        x = shots[sid]
        src = foot["sources"][x["src"]]
        speed = x.get("speed", 1)
        out.append(f"| {sid} | {where[sid]} | {x['what']} | [{src['title']}]({src['page']}), {src['date'][:4]} | {src['credit']} | "
                   f"{x['ss']} s, {round(x['dur'] * speed, 1)} s used | {speed}× |")
    out += ["", "## Predictions", "",
            "The slides are cut from the *Further* master (`video/renders/further-2050-1080p.mp4`, release v2.0) with their own captions "
            "and photo credits on screen. The full record of those photos is `video/CREDITS.md`.", "",
            "| Chapter | Slides |", "|---|---|"]
    for i, ch in enumerate(REEL["chapters"]):
        out.append(f"| {i + 1} / 6 | {', '.join(ch['slides'])} |")
    out.append(f"| last chord | {REEL['finale']['slide']} |")
    out += ["", "## Facts", "",
            "The six facts are from “Six facts about how books guess the future” on the Book Projection 2050 page "
            "(`books/template.html`), shortened to fit two bars. Their sources are named on screen and linked on that page.", "",
            "| Fact | On screen | Source named on screen |", "|---|---|---|"]
    for i, ch in enumerate(REEL["chapters"]):
        f = ch["fact"]
        out.append(f"| {i + 1} | **{f['num']}** {f['text']} | {f['src']} |")
    out += ["", "## Quotes from the books", "",
            "Word for word from `books/quotes.json`, which records how each quote was checked. A leading … marks a quote that starts mid-sentence.", "",
            "| Chapter | Quote | Book | By |", "|---|---|---|---|"]
    for i, ch in enumerate(REEL["chapters"]):
        q = ch["quote"]
        out.append(f"| {i + 1} / 6 | “{q['q']}” | *{q['book']}*, {q['year']} | {q['by']} |")
    out += ["", "## Posts on X", "",
            "Word for word from `tweets/tweets.json` (the X API text). An … marks where a post was shortened. Profile photos are from `tweets/avatars/`.", "",
            "| Chapter | Post | By | Date |", "|---|---|---|---|"]
    for i, ch in enumerate(REEL["chapters"]):
        t = ch["tweet"]
        out.append(f"| {i + 1} / 6 | {t['text'].replace('|', '/')} | [{t['name']} (@{t['handle']})](https://x.com/{t['handle']}/status/{t['id']}) | {t['date']} |")
    out += ["", "## Music and sound", "",
            f"- **Score:** “{m['title']}” by {m['by']}, licensed under [Creative Commons: By Attribution 4.0]({m['licence_url']}). "
            f"Used from {m['offset']} s for {m['length']} s, {abs(m['gain_db'])} dB quieter, with a fade out. The credit is on the end card.",
            "- **Effects:** two bass impacts, a short whoosh and a riser, the Pixabay effects bundled with *The Roast* (`roast/assets/sfx/`), no attribution needed.",
            "", "## Type", "",
            "- League Gothic and Inter, bundled with HyperFrames (SIL Open Font License).",
            "- Instrument Serif, the serif of the book wall, from Google Fonts (SIL Open Font License), in `assets/fonts/`.", ""]
    open(os.path.join(ROOT, "CREDITS.md"), "w").write("\n".join(out))


# ---------- the root: scene hosts, the score, and a few sounds with a cause on screen ----------

def audio(id_, src, at, dur, vol, lane, fade_in=0.0, fade_out=0.0, media_start=0.0):
    extra = "".join(f' {k}="{v}"' for k, v in (("data-media-start", media_start), ("data-fade-in", fade_in), ("data-fade-out", fade_out)) if v)
    return (f'      <audio id="{id_}" src="{src}" data-start="{r(at)}" data-duration="{r(dur)}" data-volume="{vol}"{extra} '
            f'data-track-index="{lane}"></audio>')


def main():
    verify()
    scenes = [intro()]
    slide_in = []
    for i, ch in enumerate(REEL["chapters"]):
        cid, t0, dur, src, parts = chapter(i, ch)
        scenes.append((cid, t0, dur, src))
        slide_in.append(t0 + next(a for kind, _, a, _ in parts if kind == "P"))
    scenes.append(finale())
    os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
    hosts = []
    # Every scene but the first starts a quarter of a frame early. Times inside a scene are rounded to
    # 0.1 ms, so without this margin a clip could start a hair after the frame it belongs to and leave
    # that frame empty (it happened once, at 1:46, in the first render).
    early = 0.25 / FPS
    starts = [t0 - early if t0 else 0 for _, t0, _, _ in scenes] + [REEL["duration"]]
    scenes = [(cid, round(starts[k], 6), round(starts[k + 1] - starts[k], 6), src) for k, (cid, _, _, src) in enumerate(scenes)]
    for cid, t0, dur, src in scenes:
        open(os.path.join(ROOT, "compositions", cid + ".html"), "w").write(src)
        hosts.append(f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{t0}" '
                     f'data-duration="{dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
    m = REEL["music"]
    total = REEL["duration"]
    sfx = [audio("music", m["file"], 0, total, 1, 10)]
    # Each fact lands with a low impact, one frame after its cut. The score is 10 dB quieter under the first
    # facts than under the last, so each impact is set against the music it lands on (about 6 dB over it).
    hit_vol = [0.16, 0.18, 0.3, 0.26, 0.36, 0.4]
    for i in range(6):
        take = 1 + i % 2
        sfx.append(audio(f"hit-{i + 1}", f"assets/sfx/impact-bass-{take}.mp3", BARS[2 + 8 * i] + (-0.04 if take == 1 else 0.01), 1.7, hit_vol[i], 11, fade_out=0.7))
    for i, t in enumerate(slide_in):  # the prediction slides push in on a short whoosh
        sfx.append(audio(f"whoosh-{i + 1}", "assets/sfx/whoosh-short.mp3", t - 0.13, 0.57, 0.5 if i % 2 == 0 else 0.42, 12))
    sfx.append(audio("riser", "assets/sfx/riser.mp3", BARS[50] - 1.47, 1.5, 0.4, 13, fade_in=0.5, fade_out=0.1, media_start=2.0))
    sfx.append(audio("hit-end", "assets/sfx/impact-bass-2.mp3", BARS[50] + 0.01, 2.4, 0.45, 11, fade_out=1.0))
    index = f"""<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>{e(REEL["title"])}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: {GROUND}; --ink: #ffffff; --accent: {ACCENT}; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 100%; height: 100%; background: var(--ground); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}
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
    credits()
    print(f"{len(scenes)} scenes, {total} s, {len(sfx)} audio clips")
    for cid, t0, dur, _ in scenes:
        print(f"  {cid:7s} {t0:8.3f} +{dur:.3f}")


if __name__ == "__main__":
    main()
