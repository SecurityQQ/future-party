# Run by build_resonance.py after the other patches (exec, shares `html`, `rep`, `re`).
# Gives Resonance the look of the other Future Party pages (hub, Soundtrack 2050, Why Music Changes):
# dark first with a light theme, #070708 / #ff5315, Inter for text, JetBrains Mono for labels and numbers,
# Instrument Serif only for italic asides, pill buttons. The original page was cream paper with olive greys;
# every one of its colours is mapped onto the project tokens below instead of being kept.
# The players, the Future Lab map and the radio stay dark in both themes, like the screens on the hub.
import colorsys

TOKENS = """:root{
  --bg:#070708; --raised:#0e0e10; --hover:rgba(255,255,255,.06); --fg:#ffffff; --fg-2:#d6d6d6; --muted:#a1a1a1;
  --line:rgba(255,255,255,.10); --line-2:rgba(255,255,255,.20);
  --accent:#ff5315; --accent-hot:#f92f02; --accent-ink:#ff6a33; --accent-soft:rgba(255,83,21,.13); --accent-mid:rgba(255,83,21,.42); --on-accent:#070708;
  --dot:#5c5c62; --pos:#67fc5c; --pos-soft:rgba(103,252,92,.10); --warn:#ffad31;
  --font:"Aeonik","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --serif:"Instrument Serif","Iowan Old Style",Georgia,serif;
  --r:10px; --r-s:6px;
  --panel:#0e0e10; --stage:#000; --p-fg:#ffffff; --p-fg-2:#d4d4d8; --p-muted:#a1a1a6; --p-dim:#6e6e73; --p-ink:#070708;
  --p-line:rgba(255,255,255,.10); --p-line-2:rgba(255,255,255,.22);
  --paper:var(--bg); --ink:var(--fg); --soft:var(--raised); --white:var(--raised); --dark:var(--panel);
  color-scheme:dark;
}
@media (prefers-color-scheme: light){
  :root:not([data-theme="dark"]){
    --bg:#ffffff; --raised:#f6f6f6; --hover:#ededee; --fg:#070708; --fg-2:#2c2c30; --muted:#737373;
    --line:#e5e5e5; --line-2:#cfcfcf;
    --accent-ink:#c63a05; --accent-soft:rgba(255,83,21,.10); --accent-mid:rgba(255,83,21,.38);
    --dot:#b9b9bd; --pos:#16883a; --pos-soft:rgba(22,136,58,.08); --warn:#a35f00;
    color-scheme:light;
  }
}
:root[data-theme="light"]{
  --bg:#ffffff; --raised:#f6f6f6; --hover:#ededee; --fg:#070708; --fg-2:#2c2c30; --muted:#737373;
  --line:#e5e5e5; --line-2:#cfcfcf;
  --accent-ink:#c63a05; --accent-soft:rgba(255,83,21,.10); --accent-mid:rgba(255,83,21,.38);
  --dot:#b9b9bd; --pos:#16883a; --pos-soft:rgba(22,136,58,.08); --warn:#a35f00;
  color-scheme:light;
}
"""

# Rules drawn on a dark surface in the original (player cards, the map, concept art, the radio).
PANEL = re.compile(r'recording-card|player-top|youtube-badge|artwork|play-overlay|recording-info|artist-name|video-credit'
                   r'|content-warning|^\.secondary-button|player-status|player-links|embed-container|future-map|map-signal'
                   r'|concept-card-art|concept-card-category|concept-card-number|seen-concept|future-player|future-stage'
                   r'|future-work-meta|future-warning|\.radio(?!-open)\b')
COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def rgba(h):
    h = h[1:]
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
    return r, g, b, a


def tone(hexcol, prop, sel, panel):
    r, g, b, a = rgba(hexcol)
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    hue *= 360
    if a < .9:                                             # translucent: shadows, scrims, hairlines
        if prop.startswith('border'):
            return 'var(--p-line)' if panel else 'var(--line)'
        if 'shadow' in prop:
            if panel and light > .8:                       # the pale halo around the play button
                return 'rgba(255,83,21,.18)'
            return f'rgba(0,0,0,{min(.6, round(a * 2.2, 2))})'
        return f'rgba(0,0,0,{round(a, 2)})' if light < .5 else 'var(--hover)'
    if hexcol.lower() == '#fffaf4':
        return 'var(--on-accent)'
    if sat > .3 and (hue < 25 or hue > 340):              # the old terracotta accent and its tints
        if light < .45:
            return 'var(--accent-hot)'
        return '#ffad31' if panel and 'shadow' not in prop else 'var(--accent-mid)'
    if 'shadow' in prop:
        return 'rgba(0,0,0,.4)' if light < .5 else 'var(--line-2)'
    if sat > .3 and 70 < hue < 160 and not panel:          # done / confirmed
        return 'var(--pos-soft)' if prop == 'background' else 'var(--pos)'
    if sat > .4 and 30 < hue < 60:                         # medium confidence; on a dark panel the dark-theme amber
        return '#ffad31' if panel else 'var(--warn)'
    if panel:
        if prop in ('background', 'background-color'):
            if hexcol.lower() == '#111':
                return 'var(--stage)'
            if 30 < hue < 60 and sat > .2:                 # the content warning box
                return 'rgba(255,173,49,.10)'
            return 'var(--panel)' if light < .5 else 'var(--p-fg)'
        if prop.startswith('border'):
            if 30 < hue < 60 and sat > .2:
                return 'rgba(255,173,49,.35)'
            return 'var(--p-line)' if light < .3 else 'var(--p-line-2)' if light < .6 else 'var(--p-muted)'
        if 30 < hue < 60 and sat > .2:
            return '#ffad31'
        return ('var(--p-fg)' if light > .88 else 'var(--p-fg-2)' if light > .74 else
                'var(--p-muted)' if light > .55 else 'var(--p-dim)')
    if prop in ('background', 'background-color'):
        if light < .3:
            return 'var(--fg)'
        return 'var(--hover)' if ':hover' in sel or 'flash' in sel else 'var(--raised)'
    if prop.startswith('border'):
        return 'var(--line)' if light > .8 else 'var(--line-2)' if light > .6 else 'var(--muted)'
    if '.active' in sel and light > .7:                    # muted text on an inverted (active) chip
        return 'var(--bg)'
    return 'var(--fg-2)' if light < .44 else 'var(--muted)' if light < .78 else 'var(--dot)'


def font_decl(d):
    """Georgia headings become Inter bold, italic asides Instrument Serif, as on the other pages."""
    m = re.match(r'font:(italic )?(?:normal )?([\d.]+px(?:/[\d.]+)?) var\(--serif\)(.*)', d)
    if not m:
        return d
    italic, size, rest = m.groups()
    if italic:
        px = float(size.split('px')[0])
        return f'font:italic 400 {round(px * 1.12)}px{size[size.index("px") + 2:]} var(--serif){rest}'
    px = float(size.split('px')[0])
    return f'font:{800 if px >= 50 else 700} {size} var(--font){rest};letter-spacing:{"-.045em" if px >= 50 else "-.025em"}'


def restyle_rule(sel, body):
    panel = bool(PANEL.search(sel)) and not sel.startswith('.library-heading')
    out = []
    for d in body.split(';'):
        if not d.strip():
            continue
        prop = d.split(':', 1)[0].strip()
        if prop.startswith('--'):
            out.append(d)
            continue
        if panel:   # text and chips that used the page colours on a dark surface
            if sel.startswith('.play-overlay') or sel.endswith('.play-overlay:hover'):
                d = d.replace('var(--paper)', 'var(--accent)').replace('var(--ink)', 'var(--on-accent)').replace('#fff', 'var(--accent-hot)')
                d = d.replace('var(--concept-color)', 'var(--accent-hot)')
            if prop in ('background', 'background-color'):
                d = d.replace('var(--paper)', 'var(--p-fg)').replace('var(--ink)', 'var(--p-ink)')
            else:
                d = d.replace('var(--paper)', 'var(--p-fg)').replace('var(--ink)', 'var(--p-ink)')
            d = d.replace('var(--concept-color)', '#ff6a33')
        d = COLOR.sub(lambda m: tone(m.group(0), prop, sel, panel), d)
        if 'var(--serif)' in d:
            d = font_decl(d)
        out.append(d)
    body = ';'.join(out)
    # Small spaced capitals are labels: JetBrains Mono like the eyebrows on the other pages, never under 10px.
    ls = re.search(r'letter-spacing:([\d.]+)px', body)
    if ls and float(ls.group(1)) >= .6:
        body = re.sub(r'letter-spacing:[\d.]+px', 'letter-spacing:.07em', body) + ';font-family:var(--mono)'
    body = re.sub(r'font-size:([\d.]+)px', lambda m: f'font-size:{max(float(m.group(1)), 10):g}px', body)
    body = re.sub(r'(font:(?:italic )?(?:\d+ )?)([\d.]+)px', lambda m: f'{m.group(1)}{max(float(m.group(2)), 10):g}px', body)
    if re.search(r'font:[78]00 [\d.]+px[^;]*var\(--font\)', body):   # a Georgia heading made bold: keep it bold
        body = re.sub(r';font-weight:(?:400|normal)(?=;|$)', '', body)
    return body


m = re.search(r'<style>(.*?)</style>', html, re.S)
css = m.group(1)
root = re.match(r':root\{[^}]*\}', css)
assert root and '--paper:#f3f1e9' in root.group(0), 'unexpected :root in Resonance css'
css = css[root.end():]
css = re.sub(r'([^{}]+)\{([^{}]*)\}', lambda r: r.group(1) + '{' + restyle_rule(r.group(1).strip(), r.group(2)) + '}', css)

# What the colour map can't say: shapes, type and surfaces that make it read as one of the party pages.
css += """
/* Future Party look */
body{font-size:16px;line-height:1.55}
.eyebrow{font:500 11px/1.4 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.site-header{height:auto;min-height:72px;padding-block:14px;flex-wrap:wrap;row-gap:12px}
.brand{font:500 14px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.brand>svg{width:26px}
.brand-dot{color:var(--accent)}
kbd{font:500 11px var(--mono);border-color:var(--line-2)}
h1 em,.rs-hero h1 em,.future-hero h1 em{font-style:normal;color:var(--accent)}
.intro-copy,.context-section p{font-size:15px}
.intro-stats,.intro-stats b,.date-range,.story-year,.rs-stats b,.result-year,.library-no,.horizon-no,.future-stage-year,
#timeline-location,.stop-year{font-variant-numeric:tabular-nums}
.chapter{background:var(--raised);border:1px solid var(--line);border-radius:var(--r-s)}
.chapter:hover{background:var(--hover)}
.chapter.active{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.mode-switch{background:var(--raised);border:1px solid var(--line);border-radius:999px}
.mode-switch a{border-radius:999px;color:var(--muted)}
.mode-switch a:hover{color:var(--fg)}
.mode-switch a.active{background:var(--fg);color:var(--bg)}
.primary-button{border-radius:999px;font:600 13px/1.2 var(--font);color:var(--on-accent)}
.primary-button:hover{background:var(--accent-hot)}
.hero-buttons .primary-button{font-size:13px}
.result-year{font:500 13px/1.3 var(--mono);letter-spacing:0;min-width:92px;flex-shrink:0}
@media(max-width:620px){
  .mode-switch{min-width:0;max-width:100%;flex:1 1 100%}
  .mode-switch a{min-width:0;padding:6px 4px;line-height:1.25;white-space:normal}
  .mode-switch a>span{display:block;margin:2px 0 0}
  .result-year{min-width:72px;font-size:12px}
  .brand{font-size:12px;letter-spacing:.04em;gap:8px;white-space:nowrap}
  .brand>svg{width:22px}
}
@media(max-width:359px){.future-subnav a span{display:none}}
.hero-buttons a:not(.primary-button){font-size:13px}
.secondary-button{border-radius:999px;font:500 13px/1.2 var(--font)}
.library-heading .secondary-button{border-color:var(--line-2)}
.complete-button,.search-filters button,.concept-filters button,.rs-filters button{border-radius:999px;font-size:13px}
.recording-card,.future-player,.radio{background:var(--panel);color:var(--p-fg);border:1px solid var(--p-line);border-radius:var(--r)}
.future-map{border:1px solid var(--p-line);border-radius:var(--r);box-shadow:none}
.concept-card{background:var(--raised);border-color:var(--line);border-radius:var(--r)}
.concept-card:hover{box-shadow:0 0 0 1px var(--line-2)}
.concept-card-art{background:#0b0b0d}
.rs-matrix-wrap,.rs-table-wrap{background:var(--raised);border-radius:var(--r)}
.rs-stops a,.future-search-wrap,.search-input-wrap{background:var(--raised);border-radius:var(--r-s)}
.possibility-box,.future-tech{background:var(--accent-soft);border-left-color:var(--accent)}
.possibility-box .eyebrow,.future-tech{color:var(--accent-ink)}
.possibility-box p{color:var(--fg-2)}
.future-bridge{background:var(--raised);border-color:var(--line);border-radius:var(--r)}
.library-tags a,.reserve-tag{background:var(--raised);color:var(--muted);border:1px solid var(--line)}
.library-tags a:hover{color:var(--accent-ink);border-color:var(--accent)}
dialog{background:var(--bg);color:var(--fg);border-color:var(--line-2);border-radius:var(--r)}
dialog::backdrop{background:rgba(0,0,0,.6)}
#toast{border-radius:999px}
.radio-open{background:var(--accent);color:var(--on-accent);box-shadow:0 8px 24px rgba(0,0,0,.35);border-radius:999px}
.radio-open:hover{background:var(--accent-hot)}
.timeline-stop.heard .stop-dot{background:var(--muted);border-color:var(--muted)}
.complete-button[aria-pressed=true]{background:var(--pos-soft);color:var(--pos);border-color:var(--pos)}
.future-work-actions button[aria-pressed=true],.signal-card .eyebrow.conf-high{color:var(--pos)}
.map-signal{background:var(--accent)}
.stop-dot{border-color:var(--dot)}
#scrubber{accent-color:var(--accent)}
a:hover{text-decoration-color:var(--accent)}
:focus-visible{outline-color:var(--accent)}
"""
html = html[:m.start(1)] + TOKENS + css + html[m.end(1):]

# Fonts and browser chrome, as on the other pages.
html = rep(html, '<meta name="theme-color" content="#f3f1e9">',
           '<meta name="theme-color" content="#070708">\n'
           '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
           '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800'
           '&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">')
html = rep(html, "fill='%23c3482c'", "fill='%23ff5315'")
html = rep(html, '<span>resonance<span class="brand-dot">.</span></span>', '<span>Resonance <span class="brand-dot">/</span> 2050</span>', 2)

# The drawings inside the cards: grey lines on black with one orange mark, like the hub's wall tiles.
for old, new, n in [("const stroke='#9aa78a'", "const stroke='#8a8a90'", 1), ('fill="#859476"', 'fill="#ffffff"', 1),
                    ('fill="#20251f"', 'fill="#0b0b0d"', 1), ('stroke="#bb6a4b"', 'stroke="#ff5315"', 1),
                    ("c?.color||'#becbac'", "c?.color||'#d4d4d8'", 1), ("'#d77954'", "'#ff6a33'", 1),
                    ('fill="#b4bda8"', 'fill="#ffffff"', 1), ('fill="#252723"', 'fill="#0e0e10"', 1),
                    ('background:#e6b4a3;border-color:transparent', 'background:var(--accent-mid);border-color:transparent', 1)]:
    html = rep(html, old, new, n)
concept_colors = re.findall(r'"color":"(#[0-9a-fA-F]{6})"', html)
assert len(concept_colors) >= 12, concept_colors
html = re.sub(r'"color":"#[0-9a-fA-F]{6}"', '"color":"#d4d4d8"', html)
left = [c for c in COLOR.findall(html[m.start():m.start() + len(TOKENS) + len(css) + 20]) if c.lower() not in
        {'#070708', '#0e0e10', '#ffffff', '#d6d6d6', '#a1a1a1', '#ff5315', '#f92f02', '#ff6a33', '#5c5c62', '#67fc5c', '#ffad31',
         '#000', '#d4d4d8', '#a1a1a6', '#6e6e73', '#f6f6f6', '#ededee', '#2c2c30', '#737373', '#e5e5e5', '#cfcfcf', '#c63a05',
         '#b9b9bd', '#16883a', '#a35f00', '#0b0b0d'}]
assert not left, f'colours left in the Resonance css: {sorted(set(left))}'
