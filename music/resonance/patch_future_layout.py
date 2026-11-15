"""Put Music of the Future's listening cards directly below its navigation.

Executed by build_resonance.py after the visual and naming patches, with
html, rep, P, and future in scope. Routes, filters, reference data, and playback
stay in the existing renderer; only its introduction and visible labels change.
"""
from pathlib import Path

# Remove the introduction and its decorative map from the document, rather than
# hiding a large, still-initialized hero. The cards retain their existing IDs.
atlas_open = '<div id="future-atlas">'
section_open = '<section class="atlas-section" aria-labelledby="atlas-heading">'
atlas_start = html.index(atlas_open) + len(atlas_open)
section_start = html.index(section_open, atlas_start)
intro = html[atlas_start:section_start]
assert intro.count('<section class="future-hero">') == 1
assert intro.count('<div class="future-route">') == 1
assert intro.count('id="future-map-art"') == 1
assert 'id="concept-grid"' not in intro
html = html[:atlas_start] + '\n    ' + html[section_start:]
html = rep(html, "$('future-map-art').innerHTML=art(null,true);", '')

# One compact title replaces the atlas's second editorial introduction.
heading_start = html.index(section_open) + len(section_open)
filters_start = html.index('<div id="concept-filters"', heading_start)
old_heading = html[heading_start:filters_start]
assert old_heading.count('id="atlas-heading"') == 1
assert '<button' not in old_heading and '<input' not in old_heading
heading = (
    '<div class="future-list-heading">'
    '<h1 id="atlas-heading">Music of the Future</h1>'
    f'<p>{len(future["concepts"])} directions · {len(future["works"])} listening references</p>'
    '</div>'
)
html = html[:heading_start] + heading + html[filters_start:]

# This is the same section, including its radio queue and document titles.
# Keep #future, the JSON identifiers, and every localStorage key unchanged.
assert '>Future Lab <span>' in html
html = html.replace('The Future Lab', 'Music of the Future')
html = html.replace('Future Lab', 'Music of the Future')
html = html.replace('Future lab navigation', 'Music of the Future navigation')

layout_css = Path(P('future-layout.css')).read_text(encoding='utf-8')
html = rep(html, '</style>', '\n' + layout_css + '\n</style>', 1)

assert '<section class="future-hero">' not in html
assert '<div class="future-route">' not in html
assert 'id="future-map-art"' not in html
assert "$('future-map-art')" not in html
assert html.count('id="concept-grid"') == 1
assert html.count('id="concept-filters"') == 1
