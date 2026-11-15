"""Draw the party chip on the App slide: a round NFC tag (coil antenna, chip pads, bridge) as inline SVG.

    python3 -I slides/tools/nfc_tag.py           # print the SVG
    python3 -I slides/tools/nfc_tag.py --write   # put it into slides/deck/slides/app.html

Every turn of the coil is the edge of the disc minus a notch around the top pad, moved inwards
by one pitch: an arc of the big circle and an arc of the notch circle. Colours and motion are in
deck.css (.tag); the slide build is slides/build.py.
"""
import math
import pathlib
import re
import sys

C = (200.0, 200.0)
R0, PITCH, N, W = 190.0, 10.0, 9, 5.6   # coil: outer centerline radius, pitch, turns, trace width
P1 = (193.0, 31.0)                      # chip pad in the notch at the top
P2 = (270.0, 150.0)                     # pad inside the coil
N0 = 31.0                               # notch radius for the outer turn
PAD = 21.0


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def ring(k):
    r, n = R0 - k * PITCH, N0 + k * PITCH
    dx, dy = P1[0] - C[0], P1[1] - C[1]
    d = math.hypot(dx, dy)
    tp = math.atan2(dy, dx)
    # angle at C between C->P1 and C->intersection
    a = math.acos((r * r + d * d - n * n) / (2 * r * d))
    A = (C[0] + r * math.cos(tp + a), C[1] + r * math.sin(tp + a))
    B = (C[0] + r * math.cos(tp - a), C[1] + r * math.sin(tp - a))
    # angle at P1 between P1->C and P1->intersection: inside arc is large if > 90deg
    b = math.acos((n * n + d * d - r * r) / (2 * n * d))
    large = 1 if b > math.pi / 2 else 0
    # big circle from A the long way round to B (clockwise on screen), then notch arc back to A
    # through the side that faces C (counter-clockwise on screen)
    return (f"M{f(A[0])} {f(A[1])}A{f(r)} {f(r)} 0 1 1 {f(B[0])} {f(B[1])}"
            f"A{f(n)} {f(n)} 0 {large} 0 {f(A[0])} {f(A[1])}")


def pad(p, cls):
    x, y = p
    dots = "".join(
        f'<rect x="{f(x - 9.6 + i * 6.8)}" y="{f(y - 9.6 + j * 6.8)}" width="5.4" height="5.4" rx="1"/>'
        for i in range(3) for j in range(3))
    return f'<circle class="{cls}" cx="{f(x)}" cy="{f(y)}" r="{f(PAD)}"/><g class="die">{dots}</g>'


coil = "".join(f'<path d="{ring(k)}"/>' for k in range(N))
inner = R0 - (N - 1) * PITCH - W / 2 - 4
svg = f'''<svg class="tag" viewBox="0 0 400 400" aria-hidden="true">
<defs>
<linearGradient id="tag-chrome" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="360" y2="380"><stop offset="0" stop-color="#f2f7ff"/><stop offset=".22" stop-color="#aec6e8"/><stop offset=".44" stop-color="#edf6ff"/><stop offset=".47" stop-color="#7da2d1"/><stop offset=".7" stop-color="#b8d6f7"/><stop offset="1" stop-color="#e2efff"/></linearGradient>
<radialGradient id="tag-base" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#16325c"/><stop offset=".7" stop-color="#0b1b36"/><stop offset="1" stop-color="#07132b"/></radialGradient>
<mask id="tag-gap"><rect width="400" height="400" fill="#fff"/><g fill="#000" stroke="#000"><circle cx="{f(P1[0])}" cy="{f(P1[1])}" r="{f(PAD + 5)}"/><circle cx="{f(P2[0])}" cy="{f(P2[1])}" r="{f(PAD + 5)}"/><line x1="{f(P1[0])}" y1="{f(P1[1])}" x2="{f(P2[0])}" y2="{f(P2[1])}" stroke-width="26"/></g></mask>
<clipPath id="tag-in"><circle cx="200" cy="200" r="{f(inner)}"/></clipPath>
<g id="tag-coil">{coil}</g>
</defs>
<circle class="base" cx="200" cy="200" r="198"/>
<g transform="rotate(-38 200 200)">
<g clip-path="url(#tag-in)"><rect class="strip" x="0" y="268" width="400" height="140"/></g>
<g mask="url(#tag-gap)"><use class="coil" href="#tag-coil"/><use class="glow" href="#tag-coil"/></g>
<line class="bridge" x1="{f(P1[0])}" y1="{f(P1[1])}" x2="{f(P2[0])}" y2="{f(P2[1])}"/>
{pad(P1, "pad")}{pad(P2, "pad")}
</g>
</svg>'''

if "--write" in sys.argv:
    slide = pathlib.Path(__file__).resolve().parents[1] / "deck/slides/app.html"
    html, n = re.subn(r'<svg class="tag".*?</svg>', lambda m: svg.replace("\n", ""), slide.read_text(), count=1, flags=re.S)
    assert n == 1, "no <svg class=\"tag\"> in app.html"
    slide.write_text(html)
    print(f"{slide}: tag drawn")
else:
    print(svg)
