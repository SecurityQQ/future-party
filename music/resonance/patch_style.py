"""Compile Resonance's visual layer from the canonical navy/chrome vibes system.

Executed last by build_resonance.py, with html/rep/re/P in scope. The original
page supplies layout and interactions; its paper/olive colors and serif type are
translated before the complete theme is added. No runtime theme patch is needed.
"""
import base64
import colorsys
from pathlib import Path

VIBES = Path(HERE).parents[1] / 'vibes'
TOKENS = (VIBES / 'tokens.css').read_text(encoding='utf-8')
TEXTURE = base64.b64encode((VIBES / 'assets' / 'chrome-orbit.webp').read_bytes()).decode('ascii')
THEME = Path(P('resonance-theme.css')).read_text(encoding='utf-8')
assert '__CHROME_TEXTURE__' in THEME
THEME = THEME.replace('__CHROME_TEXTURE__', 'data:image/webp;base64,' + TEXTURE)

ALIASES = """
:root{
  --bg:var(--v-space);--raised:var(--v-navy);--hover:rgb(67 133 255 / 10%);
  --fg:var(--v-ink);--fg-2:#c4d4eb;--muted:var(--v-muted);
  --line:var(--v-line);--line-2:#506e96;
  --accent:var(--v-ice);--accent-hot:#c7e7ff;--accent-ink:var(--v-ice);
  --accent-soft:rgb(67 133 255 / 10%);--accent-mid:rgb(67 133 255 / 42%);--on-accent:var(--v-navy);
  --dot:var(--v-chrome-mid);--pos:var(--v-ice);--pos-soft:rgb(157 216 255 / 10%);--warn:var(--v-warning);
  --font:"Geologica",system-ui,-apple-system,"Segoe UI",sans-serif;
  --display:"Unbounded","Geologica",system-ui,sans-serif;
  --mono:"Martian Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --serif:var(--display);--r:16px;--r-s:8px;
  --panel:var(--v-panel);--stage:var(--v-space);--p-fg:var(--v-ink);--p-fg-2:#c4d4eb;
  --p-muted:var(--v-muted);--p-dim:var(--v-dim);--p-ink:var(--v-navy);
  --p-line:var(--v-line);--p-line-2:#506e96;
  --paper:var(--bg);--ink:var(--fg);--soft:var(--raised);--white:var(--raised);--dark:var(--panel);
  color-scheme:dark;
}
"""

PANEL = re.compile(r'recording-card|player-top|youtube-badge|artwork|play-overlay|recording-info|artist-name|video-credit'
                   r'|content-warning|^\.secondary-button|player-status|player-links|embed-container|future-map|map-signal'
                   r'|concept-card-art|concept-card-category|concept-card-number|seen-concept|future-player|future-stage'
                   r'|future-work-meta|future-warning|\.radio(?!-open)\b')
COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def tone(value, prop, selector, panel):
    """Translate every legacy color by its visual role, never leave olive/orange behind."""
    h = value[1:]
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    alpha = int(h[6:8], 16) / 255 if len(h) == 8 else 1
    hue, light, saturation = colorsys.rgb_to_hls(r, g, b)
    hue *= 360
    if alpha < .9:
        if prop.startswith('border'):
            return 'var(--line)'
        if 'shadow' in prop:
            return 'rgb(67 133 255 / 18%)' if light > .8 else f'rgb(0 5 18 / {min(.6, alpha * 2):.2f})'
        return f'rgb(3 8 23 / {alpha:.2f})' if light < .5 else 'var(--hover)'
    if value.lower() == '#fffaf4':
        return 'var(--on-accent)'
    if 'warning' in selector or 'conf-medium' in selector:
        if prop.startswith('background'):
            return 'rgb(244 197 141 / 8%)'
        if prop.startswith('border'):
            return 'rgb(244 197 141 / 35%)'
        return 'var(--warn)'
    if 'shadow' in prop:
        return 'rgb(0 5 18 / 40%)' if light < .5 else 'var(--line-2)'
    if saturation > .3 and (hue < 25 or hue > 340):
        return 'var(--accent-mid)' if prop.startswith('background') else 'var(--accent)'
    if panel:
        if prop.startswith('background'):
            return 'var(--stage)' if value.lower() == '#111' else 'var(--panel)' if light < .5 else 'var(--p-fg)'
        if prop.startswith('border'):
            return 'var(--p-line)' if light < .3 else 'var(--p-line-2)'
        return 'var(--p-fg)' if light > .88 else 'var(--p-fg-2)' if light > .74 else 'var(--p-muted)'
    if prop.startswith('background'):
        return 'var(--fg)' if light < .3 else 'var(--hover)' if ':hover' in selector or 'flash' in selector else 'var(--raised)'
    if prop.startswith('border'):
        return 'var(--line)' if light > .8 else 'var(--line-2)'
    if '.active' in selector and light > .7:
        return 'var(--bg)'
    return 'var(--fg-2)' if light < .44 else 'var(--muted)'


def restyle_rule(selector, body):
    panel = bool(PANEL.search(selector)) and not selector.startswith('.library-heading')
    result = []
    for declaration in body.split(';'):
        if not declaration.strip():
            continue
        prop = declaration.split(':', 1)[0].strip()
        if panel:
            declaration = declaration.replace('var(--paper)', 'var(--p-fg)').replace('var(--ink)', 'var(--p-ink)')
        declaration = COLOR.sub(lambda match: tone(match.group(0), prop, selector, panel), declaration)
        # Geometric headings, readable body, mono labels: no inherited Georgia or tiny captions.
        match = re.match(r'font:(italic )?(?:normal )?([\d.]+px(?:/[\d.]+)?) var\(--serif\)(.*)', declaration)
        if match:
            italic, size, suffix = match.groups()
            declaration = f'font:{400 if italic else 500} {size} var(--display){suffix};letter-spacing:-.035em'
        declaration = re.sub(r'font-size:([\d.]+)px', lambda match: f'font-size:{max(float(match[1]), 10):g}px', declaration)
        result.append(declaration)
    body = ';'.join(result)
    spacing = re.search(r'letter-spacing:([\d.]+)px', body)
    if spacing and float(spacing[1]) >= .6:
        body = re.sub(r'letter-spacing:[\d.]+px', 'letter-spacing:.07em', body) + ';font-family:var(--mono)'
    return body


style = re.search(r'<style>(.*?)</style>', html, re.S)
assert style, 'Resonance must have its single source stylesheet'
css = style[1]
root = re.match(r':root\{[^}]*\}', css)
assert root and '--paper:#f3f1e9' in root[0], 'Unexpected base stylesheet'
css = css[root.end():]
css = re.sub(r'([^{}]+)\{([^{}]*)\}', lambda rule: rule[1] + '{' + restyle_rule(rule[1].strip(), rule[2]) + '}', css)
assert not COLOR.search(css), 'A legacy color escaped the theme compiler'
html = html[:style.start(1)] + TOKENS + ALIASES + css + THEME + html[style.end(1):]

html = rep(html, '<meta name="theme-color" content="#f3f1e9">',
           '<meta name="theme-color" content="#030817">\n'
           '<meta name="color-scheme" content="dark">\n'
           '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
           '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geologica:wght@400;500;600;700'
           '&family=Unbounded:wght@400;500;600&family=Martian+Mono:wght@400;500&display=swap">')
html = rep(html, "fill='%23c3482c'", "fill='%2307132b'")
html = rep(html, "stroke='%23fff'", "stroke='%239dd8ff'")
html = rep(html, '<span>resonance<span class="brand-dot">.</span></span>', '<span>Resonance <span class="brand-dot">/</span> 2050</span>', 2)

# Drawings are visual content too. Keep their geometry, recolor all inline SVG and
# the concept color metadata to the same ice/cobalt/chrome family.
for old, new, count in [
    ("const stroke='#9aa78a'", "const stroke='#9dd8ff'", 1),
    ('fill="#859476"', 'fill="#8faacf"', 1), ('fill="#20251f"', 'fill="#07132b"', 1),
    ('stroke="#bb6a4b"', 'stroke="#dce9fb"', 1), ("c?.color||'#becbac'", "c?.color||'#9dd8ff'", 1),
    ("'#d77954'", "'#edf4ff'", 1), ('fill="#b4bda8"', 'fill="#8faacf"', 1),
    ('fill="#252723"', 'fill="#07132b"', 1),
    ('background:#e6b4a3;border-color:transparent', 'background:var(--accent-mid);border-color:transparent', 1),
]:
    html = rep(html, old, new, count)
colors = iter(['#93b6ff', '#9dd8ff', '#dce9fb', '#7caaff', '#bed2ee', '#78bbef'] * 2)
assert len(re.findall(r'"color":"#[0-9a-fA-F]{6}"', html)) == 12
html = re.sub(r'"color":"#[0-9a-fA-F]{6}"', lambda _: '"color":"' + next(colors) + '"', html)
assert '#ff5315' not in html and '#67fc5c' not in html, 'Old party palette escaped into output'
