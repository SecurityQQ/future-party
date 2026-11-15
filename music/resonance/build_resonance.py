"""Build the extended Resonance app from the user's original file plus additions.json.

Inputs:  resonance_base.html (copy of ~/Downloads/Resonance_History_and_Future.html),
         additions.json, ../eras.json (sourced 2024-26 signals).
Outputs: dist/Resonance_History_and_Future.html (full document, works as a local file),
         dist/resonance_artifact.html (same page without the document skeleton, for publishing).
Run: python3 -I build_resonance.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(HERE, *a)
src = open(P('resonance_base.html'), encoding='utf-8').read()
add = json.load(open(P('additions.json'), encoding='utf-8'))
eras = json.load(open(P('..', 'eras.json'), encoding='utf-8'))


def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f'expected {n} x {a[:70]!r}, found {c}'
    return s.replace(a, b)


def script_json(html, sid):
    m = re.search(r'(<script id="%s" type="application/json">)(.*?)(</script>)' % sid, html, re.S)
    assert m, sid
    return m, json.loads(m.group(2))


dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

# ---------- 1. History stops: merge, sort, renumber ----------
m_tracks, tracks = script_json(src, 'track-data')
assert len(tracks) == 36
chap_keys = [c['key'] for c in add['chapters']]
merged = []
for t in tracks:
    t = dict(t)
    t['_orig'] = t['id']
    t['_chap'] = 'orig%d' % t['chapter']
    t['_sort'] = float(t['year'])
    merged.append(t)
for s in add['stops']:
    t = {k: v for k, v in s.items() if k not in ('key', 'chapterKey', 'sort')}
    t.update(_key=s['key'], _chap=s['chapterKey'], _sort=float(s['sort']), videoStart=0, explicit=False,
             videoSource='https://www.youtube.com/watch?v=' + s['videoId'])
    t['sources'] = s['sources'] + [{'title': 'Selected YouTube example', 'url': t['videoSource']}]
    merged.append(t)
merged.sort(key=lambda t: (chap_keys.index(t['_chap']), t['_sort']))
old2new, key2new = {}, {}
for k, ov in add.get('overrides', {}).items():
    oid = int(k.split(':')[1])
    hit = [t for t in merged if t.get('_orig') == oid]
    assert len(hit) == 1, k
    hit[0].update(ov)
    hit[0]['sources'] = [s if s['title'] != 'Selected YouTube example' else {'title': s['title'], 'url': ov['videoSource']} for s in hit[0]['sources']]
for i, t in enumerate(merged, 1):
    t['id'] = i
    t['chapter'] = chap_keys.index(t.pop('_chap'))
    t['sortYear'] = t.pop('_sort')
    if '_orig' in t: old2new[t.pop('_orig')] = i
    if '_key' in t: key2new[t.pop('_key')] = i
N = len(merged)
# chapters must be contiguous and chronological within each chapter
assert [t['chapter'] for t in merged] == sorted(t['chapter'] for t in merged)

# ---------- 2. Future data: remap origins, add sourced signals ----------
m_future, future = script_json(src, 'future-data')
for c in future['concepts']:
    c['origin'] = old2new[c['origin']]
future['version'] = 4
future['checked'] = '2026-11-14'
links = add['signalLinks']
ref = lambda r: old2new[int(r.split(':')[1])] if r.startswith('orig:') else key2new[r]
future['signals'] = []
concept_ids = {c['id'] for c in future['concepts']}
for s in eras['scenarios']:
    L = links[s['id']]
    assert all(c in concept_ids for c in L['concepts']), s['id']
    future['signals'].append({'id': s['id'], 'title': s['title'], 'conf': s['conf'], 'signals': s['signals'],
                              'rhymes': s['rhymes'], 'music': s['music'], 'watch': s['watch'],
                              'concepts': L['concepts'], 'history': [ref(r) for r in L['history']],
                              'question': L['question']})
n_signals = sum(len(s['signals']) for s in future['signals'])

html = src
html = html.replace(m_tracks.group(0), m_tracks.group(1) + dump(merged) + m_tracks.group(3))
m_future, _ = script_json(html, 'future-data')
html = html.replace(m_future.group(0), m_future.group(1) + dump(future) + m_future.group(3))
first, last = merged[0]['date'].replace('c. ', ''), merged[-1]['date']

# ---------- 3. Markup ----------
L = add['links']
html = rep(html, '36 historical stops, 27 listening references, and on-demand YouTube listening rooms.',
           f'{N} historical stops from 1400 BCE to 2024, 27 listening references, {n_signals} sourced signals for what comes next, and YouTube listening rooms.')
html = rep(html, 'History <span>1720—2024</span>', 'History <span>1400 BCE—2024</span>')
html = rep(html, 'FROM BACH TO THE DIGITAL VOICE', 'FROM A CLAY TABLET TO THE DIGITAL VOICE')
html = rep(html, '<span class="date-range">1720 <span>—</span> 2024</span>', '<span class="date-range">1400 BCE <span>—</span> 2024</span>')
html = rep(html, '<span><b>36</b> listening stops</span><span><b>6</b> chapters</span>',
           f'<span><b>{N}</b> listening stops</span><span><b>{len(add["chapters"])}</b> chapters</span>')
html = rep(html, 'One route through music. Not the whole world.', 'One route through music, now from 1400 BCE. Still not the whole world.')
html = rep(html, '<span id="timeline-location">01 / 36</span>', f'<span id="timeline-location">01 / {N}</span>')
html = rep(html, 'max="36"', f'max="{N}"')
html = rep(html, '<span class="lens" id="lens"></span>', '<span class="lens" id="lens"></span><span class="lens layer-tag" id="layer" hidden></span>')
html = rep(html, '9 concepts · 20 references · Open questions for 2040.', f'12 concepts · 27 references · {n_signals} measured signals · Open questions for 2040.')
html = rep(html, '<strong id="progress-text">0 of 36 marked as listened</strong>', f'<strong id="progress-text">0 of {N} marked as listened</strong>')
html = rep(html, '<div class="collection-actions">',
           f'<div class="collection-actions"><a class="quiet-button" href="{L["routePlaylist"]}" target="_blank" rel="noopener noreferrer">Extended route on YouTube ↗</a>')
html = rep(html, '<a href="#future=horizon" data-future-nav="horizon">2040, maybe <span>↗</span></a>',
           f'<a href="#future=signals" data-future-nav="signals">Signals now <span>{n_signals}</span></a>\n    <a href="#future=horizon" data-future-nav="horizon">2040, maybe <span>↗</span></a>')
html = rep(html, '<span><b>27</b> references</span>', f'<span><b>27</b> references</span><span><b>{n_signals}</b> signals</span>')
signals_section = f'''<section id="future-signals" hidden aria-labelledby="signals-heading"><div class="horizon-heading"><p class="eyebrow">MEASURED 2024–2026 · SOURCED, NOT PREDICTED</p><div><h1 id="signals-heading">Now<span>.</span></h1><p>The thought experiments ask what we want.<br>These figures show what is <em>already moving.</em></p></div><p class="horizon-intro">{n_signals} figures from Deezer, Spotify, IFPI, the UN, RIAA, Luminate, Pollstar, labels and new laws, grouped into six contexts.<br>Each links to a concept in the atlas and to the stops in the history where the past rhymes.</p></div><div id="signals-cards"></div><p class="horizon-footnote">Figures come from company reports, industry bodies and press dated 2024–2026 and may be revised. Confidence says how strongly the signals already point one way; the sounds described are speculation.</p><a class="quiet-button" href="#future">← Return to the concept atlas</a></section>
  <section id="future-horizon" hidden'''
html = rep(html, '<section id="future-horizon" hidden', signals_section)
about_add = f'''<h3>Added in this edition</h3><p>Two chapters before 1720 (15 stops: Ugarit, Vedic India, Zhou China, Delphi, the Seikilos song, Gregorian chant, the Silk Road pipa, Hildegard, the troubadours, Pérotin, Machaut, Luther, Palestrina, Tallis and Monteverdi) and nine stops from a wider world: spirituals, Shostakovich under siege, Sam Cooke, Tropicália, Bob Marley, Kino, the first K-pop, Afrobeats and Ukraine’s Eurovision song. Added stops are marked; the original 36 keep their text. The Future Lab gains <a href="#future=signals">Signals now</a>: {n_signals} sourced figures from 2024–2026 linked to its concepts.</p><p>The same route, extended, is a YouTube playlist: <a href="{L["routePlaylist"]}" target="_blank" rel="noopener noreferrer">History of Music, 2000 BCE → 2050</a>. Companion pages: <a href="{L["whyPage"]}" target="_blank" rel="noopener noreferrer">Why Music Changes</a> (eras, forces, scenarios) and <a href="{L["soundtrackPage"]}" target="_blank" rel="noopener noreferrer">Soundtrack 2050</a> with its <a href="{L["soundtrackPlaylist"]}" target="_blank" rel="noopener noreferrer">party playlist</a>. Both playlists are private to their owner.</p><h3>Where the music plays inside the page</h3><p>At <a href="{L["web"]}/" target="_blank" rel="noopener noreferrer">{L["web"].split("//")[1]}</a> the listening room, Continuous play and Resonance Radio play YouTube right here, on a phone too. The copy on claude.ai and the single downloaded file cannot embed YouTube, so there each recording opens on YouTube.</p><h3>Explore at your own pace</h3>'''
html = rep(html, '<h3>Explore at your own pace</h3>', about_add)
html = rep(html, 'It is not a complete or global history of music.</p>',
           'It is not a complete or global history of music; this edition reaches back to ancient Mesopotamia, India, China and Greece and adds some stops from a wider world.</p>')

# ---------- 4. CSS ----------
css_add = '''
/* Extended edition: added stops, eight chapters, measured signals. */
.chapters{grid-template-columns:repeat(8,minmax(0,1fr))}.chapter-name{max-width:none}
.layer-tag{margin-left:6px;background:transparent;border:1px solid #d5b8a9;color:var(--accent)}
.timeline-stop.added .stop-dot{border-color:var(--accent)}
.signal-list{list-style:none;margin:0 0 18px;padding:0}.signal-list li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px dashed #c8cfb9;font-size:12px;line-height:1.75;color:#717a64}.signal-list b{font:21px/1.2 var(--serif);color:var(--ink);font-weight:400;letter-spacing:-.4px}.signal-list a{color:var(--accent);font-size:10px;text-decoration:none;white-space:nowrap}.signal-list a:hover{text-decoration:underline}
.signal-links{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:4px}.signal-card .eyebrow.conf-high{color:#4c6441}.signal-card .eyebrow.conf-medium{color:#8b6a2c}.signal-card .eyebrow.conf-low{color:var(--muted)}
.about-dialog a{color:var(--accent)}
@media(max-width:620px){.signal-list li{grid-template-columns:70px minmax(0,1fr)}.signal-list b{font-size:17px}}
'''
html = rep(html, '/* Contain decorative horizon orbit without horizontal tablet overflow. */', css_add + '/* Contain decorative horizon orbit without horizontal tablet overflow. */')

# ---------- 5. History script ----------
chap_js = 'const chapters = ' + json.dumps([{k: c[k] for k in ('name', 'range', 'description', 'short')} for c in add['chapters']], ensure_ascii=False) + ';'
html, nsub = re.subn(r'const chapters = \[.*?\n  \];', lambda m: chap_js, html, count=1, flags=re.S)
assert nsub == 1
html = rep(html, "const STORAGE_KEY = 'resonance-journey-v1';", "const STORAGE_KEY = 'resonance-journey-v2';")
helpers = """const FRAMED = (()=>{try{return window.self!==window.top}catch{return true}})();
  const openExternal = url => {const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();};
  const LOCAL = !/^https?:$/.test(location.protocol) || FRAMED;"""
html = rep(html, "const LOCAL = !/^https?:$/.test(location.protocol);", helpers)
html = rep(html, "let toastTimer, apiSlowTimer;", "let toastTimer, apiSlowTimer, resetArmed=false;")
html = rep(html, "<button class=\"timeline-stop\" data-track=\"${t.id}\"", "<button class=\"timeline-stop${t.layer?' added':''}\" data-track=\"${t.id}\"")
art_new = """const c=[6,7,0,1,2,3,4,5][track.chapter]; let shapes='';"""
html = rep(html, "const c=track.chapter; let shapes='';", art_new)
art_branches = """if(c===6) {
      for(let r=0;r<9;r++){for(let i=0;i<22;i++){const x=72+i*19+(r%2)*6,y=50+r*22;shapes+=`<path d="M${x} ${y}l7 4-7 4" opacity="${(.2+((i*7+r*3)%5)*.1).toFixed(2)}"/>`;}}
      shapes+='<rect x="52" y="34" width="456" height="212" rx="18" opacity=".25"/>';
    } else if(c===7) {
      for(let i=0;i<9;i++){const x=64+i*50;shapes+=`<path d="M${x} 250V138Q${x+24} 64 ${x+48} 138V250" opacity="${(.22+(i%3)*.12).toFixed(2)}"/>`;}
      for(let i=0;i<14;i++){shapes+=`<circle cx="280" cy="96" r="${8+i*5}" opacity="${(.5-i*.03).toFixed(2)}"/>`;}
    } else if(c===0) {"""
html = rep(html, "    if(c===0) {\n      for(let i=0;i<30;i++)", "    " + art_branches + "\n      for(let i=0;i<30;i++)")
html = rep(html, "$('lens').textContent=t.lens;",
           "$('lens').textContent=t.lens;\n    $('layer').hidden=!t.layer;$('layer').textContent=t.layer==='before'?'Added · before 1720':t.layer==='wider'?'Added · wider world':'';")
html = rep(html, "'Local preview: playback opens on YouTube. Run the included server for the in-page player.'",
           "(FRAMED?'Playback opens on YouTube in a new tab.':'Local preview: playback opens on YouTube. Run the included server for the in-page player.')")
html = rep(html, "window.open(youtubeURL(t),'_blank','noopener,noreferrer');", "openExternal(youtubeURL(t));")
html = rep(html, "const text='RESONANCE — A listening history\\n36 stops · 1720–2024\\n\\n'",
           "const text=`RESONANCE — A listening history\\n${tracks.length} stops · ${tracks[0].date}–${tracks[tracks.length-1].date}\\n\\n`")
html = rep(html, "    const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Resonance-track-list.txt';",
           "    if(FRAMED){navigator.clipboard.writeText(text).then(()=>toast('Track list copied to the clipboard.'),()=>toast('Copy is unavailable here.'));return;}\n    const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Resonance-track-list.txt';")
html = rep(html, "if(window.confirm('Reset your listening progress? Saved stops will be kept.')){listened.clear();persist();updateProgress();toast('Listening progress reset. Your saved stops are unchanged.');}",
           "if(!resetArmed){resetArmed=true;$('reset-progress').textContent='Click again to reset';setTimeout(()=>{resetArmed=false;$('reset-progress').textContent='Reset progress';},4000);return;}resetArmed=false;$('reset-progress').textContent='Reset progress';listened.clear();persist();updateProgress();toast('Listening progress reset. Your saved stops are unchanged.');")

# ---------- 6. Future script ----------
fhelpers = """const FRAMED=(()=>{try{return window.self!==window.top}catch{return true}})();
  const openExternal=url=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();};
  const LOCAL=!/^https?:$/.test(location.protocol)||FRAMED;"""
html = rep(html, "const LOCAL=!/^https?:$/.test(location.protocol);", fhelpers)
html = rep(html, "window.open(workURL(w),'_blank','noopener,noreferrer');", "openExternal(workURL(w));")
html = rep(html, "'Local file: playback opens on YouTube. Serve this app for the in-page player.'",
           "(FRAMED?'Playback opens on YouTube in a new tab.':'Local file: playback opens on YouTube. Serve this app for the in-page player.')")
html = rep(html, "    const b=new Blob([text],{type:'text/plain;charset=utf-8'})",
           "    if(FRAMED){navigator.clipboard.writeText(text).then(()=>toast('Listening notes copied to the clipboard.'),()=>toast('Copy is unavailable here.'));return;}\n    const b=new Blob([text],{type:'text/plain;charset=utf-8'})")
render_signals = r"""  function renderSignals(){
    const T=JSON.parse(document.getElementById('track-data').textContent);
    const CONF={high:'HIGH CONFIDENCE',medium:'MEDIUM CONFIDENCE',low:'LOW CONFIDENCE'};
    $('signals-cards').innerHTML=(data.signals||[]).map((s,i)=>`<article class="horizon-card signal-card"><span class="horizon-no">${pad(i+1)}</span><div><p class="eyebrow conf-${esc(s.conf)}">${CONF[s.conf]||''}</p><h2>${esc(s.title)}</h2><div class="signal-links">${s.concepts.filter(id=>concepts.has(id)).map(id=>`<a class="quiet-button" href="${href(id)}">Concept ${pad(concepts.get(id).number)}: ${esc(concepts.get(id).title)} ↗</a>`).join('')}${s.history.map(id=>{const t=T[id-1];return t?`<a class="quiet-button" href="#track=${id}">Listen back: ${esc(t.artist)} · ${esc(t.shortTitle)} ↗</a>`:'';}).join('')}</div></div><div><p class="eyebrow">THE SIGNAL TODAY · MEASURED</p><ul class="signal-list">${s.signals.map(g=>`<li><b>${esc(g.v)}</b><span>${esc(g.text)} <a href="${esc(g.src)}" target="_blank" rel="noopener noreferrer">${esc(g.label)} ↗</a></span></li>`).join('')}</ul><p class="eyebrow">HISTORY RHYMES WITH</p><p>${esc(s.rhymes)}</p><p class="eyebrow">ONE POSSIBLE SOUND · SPECULATION</p><p>${s.music.map(esc).join(' ')}</p><p class="eyebrow">WATCH FOR</p><p>${esc(s.watch)}</p><div class="horizon-question">${esc(s.question)}</div></div></article>`).join('');
  }
"""
html = rep(html, "  function cleanup(){generation++;", render_signals + "  function cleanup(){generation++;")
html = rep(html, "let section=raw==='library'?'library':raw==='horizon'?'horizon':concepts.has(raw)?'detail':'atlas';",
           "let section=raw==='library'?'library':raw==='horizon'?'horizon':raw==='signals'?'signals':concepts.has(raw)?'detail':'atlas';")
html = rep(html, "for(const s of ['atlas','detail','library','horizon'])", "for(const s of ['atlas','detail','library','horizon','signals'])")
html = rep(html, "if(section==='horizon'){renderHorizon();document.title='2040, maybe — Resonance';}",
           "if(section==='horizon'){renderHorizon();document.title='2040, maybe — Resonance';}if(section==='signals'){renderSignals();document.title='Signals now — Resonance';}")

exec(open(P('patch_playback.py'), encoding='utf-8').read())
exec(open(P('patch_research.py'), encoding='utf-8').read())

# ---------- 7. Write ----------
os.makedirs(P('dist'), exist_ok=True)
open(P('dist', 'Resonance_History_and_Future.html'), 'w', encoding='utf-8').write(html)
# Served copy: dist/local/index.html next to 'Open Resonance.command' (the built-in player needs http://).
os.makedirs(P('dist', 'local'), exist_ok=True)
open(P('dist', 'local', 'index.html'), 'w', encoding='utf-8').write(html)
art = html
art = rep(art, '<!doctype html>\n<html lang="en">\n<head>\n', '')
art = rep(art, '</head>\n<body>\n', '\n')
art = rep(art, '</body></html>', '')
art = re.sub(r'<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n', '', art, count=1)
open(P('dist', 'resonance_artifact.html'), 'w', encoding='utf-8').write(art)
added = sum(1 for t in merged if t.get('layer'))
print(f'stops {N} (original 36 + added {added}), chapters {len(add["chapters"])}, signals {n_signals}; '
      f'origins remapped {len(future["concepts"])}; full {len(html.encode())} bytes, artifact {len(art.encode())} bytes')
