"""Music of the Future in History's layout.

Executed by build_resonance.py after patch_history_layout.py (whose glass_folder,
escape_html and era-browser files it reuses) and patch_future_layout.py. The twelve
directions become glass folders, the listening references of the open direction sit
on the molten ring, and a direction's page puts the listening room on the left and
the idea on the right, as History does with a recording and its story. Routes,
storage keys, playback and the library, signals and horizon pages are unchanged.
"""

known_works = {w['id'] for w in future['works']}


def examples(c):
    """The same order as the page's listFor(): featured, related, then every work tagged with it."""
    order = [c['featured'], *c['related'], *(w['id'] for w in future['works'] if c['id'] in w['concepts'])]
    return [x for i, x in enumerate(order) if x in known_works and order.index(x) == i]


route_length = sum(len(examples(c)) for c in future['concepts'])
future_folders = ''.join(
    glass_folder(g, 'future-concept', f'{c["number"]:02d} · {c["category"].upper()}', c['title'], len(examples(c)), 'future-recording future-detail')
    for g, c in enumerate(future['concepts']))
future_controls = f'''<section class="history-controls future-controls" id="future-controls" hidden aria-label="Choose a direction and an example">
    <h1 class="history-visually-hidden">Music of the Future</h1>
    <div class="era-picker"><span id="future-period-label" class="history-visually-hidden">Directions</span><button id="future-period-earlier" class="icon-button era-scroll era-scroll-prev" aria-label="Scroll to earlier directions">←</button><div id="future-period" class="era-strip" role="group" aria-labelledby="future-period-label">{future_folders}</div><button id="future-period-later" class="icon-button era-scroll era-scroll-next" aria-label="Scroll to later directions">→</button></div>
    <div class="recordings">
      <div class="recordings-head"><p class="recordings-title" id="future-recording-label"><span>In this direction</span><b id="future-era-name"></b><span id="future-era-position"></span></p>
      <div class="history-step-controls" aria-label="Move through every example"><button id="future-previous" class="icon-button" aria-label="Previous example">←</button><output id="future-position" class="era-position" aria-live="polite" aria-atomic="true">01 / {route_length}</output><button id="future-next" class="icon-button" aria-label="Next example">→</button></div></div>
      <div id="future-recording" class="molten" aria-controls="future-detail"><canvas tabindex="0" role="listbox" aria-labelledby="future-recording-label"></canvas><p class="molten-hint" aria-hidden="true">drag · swipe · ← →</p></div>
    </div>
  </section>
  <div id="future-atlas">'''
html = rep(html, '<div id="future-atlas">', future_controls)

# ---- a direction's page: actions on top, the listening room left, the idea right ----
detail_start = html.index('  function renderDetail(c,w){')
detail_end = html.index('  function renderLibrary(){', detail_start)
old_detail = html[detail_start:detail_end]
for piece in ('future-play-overlay', 'future-embed', 'future-play-sample', 'future-play-full', 'future-player-status',
              'future-save-work', 'future-heard-work', 'future-share', 'future-listen-note', 'future-work-context'):
    assert piece in old_detail, piece
new_detail = r'''  function renderDetail(c,w){
    cleanup();currentConcept=c.id;currentWork=w.id;lastConcept=c.id;visited.add(c.id);persist();
    const length=Math.min(90,w.duration||90),g=data.concepts.findIndex(x=>x.id===c.id),i=Math.max(0,FUTURE_GROUPS[g].findIndex(x=>x.id===w.id));
    $('future-detail').style.setProperty('--concept-color',c.color);
    $('future-detail').innerHTML=`<div class="story-heading"><div class="story-tools"><button class="quiet-button" id="future-save-work" aria-pressed="false">◇ Save</button><button class="quiet-button" id="future-share">Share ↗</button></div></div>
    <div class="future-detail-grid">
    <aside class="future-player-column" aria-label="The listening room"><div class="future-player"><div class="future-player-label"><span>THE LISTENING ROOM</span><span>YOUTUBE · ON DEMAND</span></div><div class="future-player-stage" id="future-player-stage">${art(c)}<span class="future-stage-year">${w.year||'LISTEN'}</span><span class="future-stage-caption">CONCEPT STUDY · NOT THE VIDEO</span><button id="future-play-overlay" class="play-overlay" aria-label="Play ${esc(w.artist)} — ${esc(w.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg></button><div id="future-embed" hidden></div></div>
    <div class="future-player-info"><span class="artist-name">${esc(w.artist)}</span><h2>${esc(w.title)}</h2><p class="future-work-meta">${esc(w.dateNote||w.year||'Upload date unconfirmed')} · ${esc(w.format)}${w.reserve?' · FROM THE RESERVE SHELF':''}</p>${w.warning?`<p class="future-warning">VIEWER NOTE · ${esc(w.warning)}</p>`:''}
    <div class="player-actions"><button id="future-play-sample" class="primary-button">▶ ${LOCAL?'Play on YouTube':length===75?'Play 75-sec track':'Play 90-sec sample'}</button><button id="future-play-full" class="secondary-button">Full ${w.format.toLowerCase().includes('set')?'set':'recording'} </button></div><button class="complete-button future-heard" id="future-heard-work" aria-pressed="false">○ Mark as listened</button><p class="player-status" id="future-player-status" aria-live="polite">${LOCAL?'Press play to listen here. In this copy the player loads from resonance-2050.vercel.app.':'Video loads only after you press play. Nothing starts automatically.'}</p><div class="player-links"><a href="${esc(workURL(w))}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>${w.playlist?`<a href="${esc(w.playlist)}" target="_blank" rel="noopener noreferrer">Album playlist ↗</a>`:`<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(w.artist+' '+w.title)}" target="_blank" rel="noopener noreferrer">Alternative upload ↗</a>`}</div></div></div>
    <div class="future-listen-note"><p class="eyebrow">◎ WHILE YOU LISTEN / WATCH</p><p>${esc(w.listen)}</p></div>
    <details class="future-work-context"><summary>About this example, technique & credits +</summary><p>${esc(w.note)}</p><span class="future-tech">${esc(w.tech)}</span>${sourceLinks(w.sources)}<p>${esc(w.verification)} YouTube availability and embedding permissions depend on the upload, region and browser. Dates refer to a release or presentation unless otherwise noted.</p></details></aside>
    <article class="future-detail-copy"><div class="story-meta"><span class="story-year">${pad(c.number)}</span><span class="genre">${esc(c.category)} · ${esc(c.subtitle)}</span></div><h2 id="future-detail-title">${esc(c.title)}</h2><p class="future-detail-deck">${esc(c.question)}</p>
    <section class="future-context"><h3><span>01</span> Why this is happening</h3><p>${esc(c.context)}</p></section><section class="future-context"><h3><span>02</span> What changes in the experience</h3><p>${esc(c.change)}</p></section>
    <div class="possibility-box"><p class="eyebrow">2050? · A POSSIBILITY, NOT A PREDICTION</p><p>${esc(c.future)}</p></div>
    <a class="history-connection" href="#track=${c.origin}"><span class="eyebrow">LISTEN BACK · A CONNECTION TO HISTORY</span><strong>${esc(c.originLabel)} ↗</strong><small>${esc(c.bridge)}</small></a>
    <details class="future-concept-sources"><summary>Sources & curatorial notes +</summary>${sourceLinks(c.sources)}<p>Context is a sourced synthesis. Listening prompts, comparisons and 2050 scenarios are curatorial interpretations, not claims of direct influence or inevitable progress.</p></details></article></div>`;
    renderFutureChoices(g,i);
    updateProgress();document.title=`${c.title} — Music of the Future · History of Music 2050`;
  }
'''
html = html[:detail_start] + new_detail + html[detail_end:]

# ---- routes: the atlas is now the open direction; the page no longer jumps to the top on every pick ----
html = rep(html, "setMode('future');const raw=p.get('future')||'atlas';",
           "setMode('future');const asked=p.get('future')||'atlas',raw=concepts.has(asked)||['library','horizon','signals'].includes(asked)?asked:(lastConcept||data.concepts[0].id);")
html = rep(html, "for(const s of ['atlas','detail','library','horizon','signals'])$('future-'+s).hidden=s!==section;",
           "for(const s of ['atlas','detail','library','horizon','signals'])$('future-'+s).hidden=s!==section;$('future-controls').hidden=section!=='detail';")
html = rep(html, "if(!initial&&(section!==lastSection||section==='detail'&&previousConcept!==currentConcept)){",
           "if(!initial&&section!==lastSection){")
# ← → walk every example in order, as they walk every recording in History
html = rep(html, "if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const c=concepts.get(currentConcept),step=e.key==='ArrowRight'?1:-1;const next=data.concepts[(c.number-1+step+data.concepts.length)%data.concepts.length];navigate(next.id);}",
           "if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepFuture(e.key==='ArrowRight'?1:-1);}")

future_init = r'''  // Directions as glass folders and examples on the molten ring (era-browser.js), as in History.
  const FUTURE_GROUPS=data.concepts.map(c=>listFor(c).map(id=>works.get(id)));
  const ROUTE=FUTURE_GROUPS.flatMap((list,g)=>list.map((w,i)=>({c:data.concepts[g].id,w:w.id,g,i})));
  let futureEras=null,lastConcept=null;
  try{futureEras=window.ResonanceEras?.mount({root:$('future-recording'),strip:$('future-period'),folderAttr:'futureConcept',palettes:'future',folderSeed:g=>g*11+5,
    groups:FUTURE_GROUPS.map((list,g)=>list.map(w=>({seed:(window.ResonanceEras.hash(w.id)%9973)+g,date:w.year?String(w.year):'Undated',genre:w.format,artist:w.artist,title:w.title}))),
    reducedMotion:reduced,label:'Examples of this direction',onSelect:(g,i)=>navigate(data.concepts[g].id,FUTURE_GROUPS[g][i].id)})||null;}catch(error){console.warn('Future directions could not start',error);}
  function routeIndex(){return ROUTE.findIndex(r=>r.c===currentConcept&&r.w===currentWork);}
  function stepFuture(step){const r=ROUTE[routeIndex()+step];if(r)navigate(r.c,r.w);}
  function updateFuturePeriodScroll(){const s=$('future-period');$('future-period-earlier').disabled=s.scrollLeft<=2;$('future-period-later').disabled=s.scrollLeft+s.clientWidth>=s.scrollWidth-2;s.classList.toggle('can-earlier',!$('future-period-earlier').disabled);s.classList.toggle('can-later',!$('future-period-later').disabled);}
  function centerFuturePeriod(smooth=true){if(document.body.dataset.view!=='future'||$('future-controls').hidden)return;const s=$('future-period'),a=s.querySelector('.active');if(!a)return;s.scrollTo({left:a.offsetLeft-(s.clientWidth-a.offsetWidth)/2,behavior:smooth&&!reduced?'smooth':'instant'});updateFuturePeriodScroll();}
  function renderFutureChoices(g,i){
    $('future-period').querySelectorAll('[data-future-concept]').forEach(b=>{const on=Number(b.dataset.futureConcept)===g;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    requestAnimationFrame(()=>centerFuturePeriod());
    const at=routeIndex();
    $('future-era-name').textContent=data.concepts[g].title;
    $('future-era-position').textContent=`${pad(i+1)} / ${pad(FUTURE_GROUPS[g].length)}`;
    $('future-position').textContent=`${pad(at+1)} / ${ROUTE.length}`;$('future-position').setAttribute('aria-label',`Example ${at+1} of ${ROUTE.length}`);
    for(const [id,step] of [['future-previous',-1],['future-next',1]]){const r=ROUTE[at+step],b=$(id);b.disabled=!r;b.setAttribute('aria-label',r?`${step<0?'Previous':'Next'}: ${works.get(r.w).artist}, ${works.get(r.w).title}`:`${step<0?'First':'Last'} example`);}
    try{futureEras?.update(g,i);}catch(error){console.warn('Future directions could not update',error);}
  }
  $('future-period').addEventListener('click',e=>{const b=e.target.closest('[data-future-concept]');if(b)navigate(data.concepts[Number(b.dataset.futureConcept)].id);});
  $('future-period').addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const b=e.target.closest('[data-future-concept]');if(!b)return;
    e.preventDefault();e.stopPropagation();const next=$('future-period').querySelector(`[data-future-concept="${Number(b.dataset.futureConcept)+(e.key==='ArrowRight'?1:-1)}"]`);
    if(next){next.focus({preventScroll:true});next.click();}
  });
  $('future-period').addEventListener('scroll',updateFuturePeriodScroll,{passive:true});
  for(const [id,dir] of [['future-period-earlier',-1],['future-period-later',1]])$(id).addEventListener('click',()=>$('future-period').scrollBy({left:dir*Math.max(180,$('future-period').clientWidth*.7),behavior:reduced?'instant':'smooth'}));
  $('future-previous').addEventListener('click',()=>stepFuture(-1));$('future-next').addEventListener('click',()=>stepFuture(1));
  window.addEventListener('resize',()=>centerFuturePeriod(false));
'''
html = rep(html, '  renderAtlas();renderHorizon();route(true);\n})();', future_init + '  renderAtlas();renderHorizon();route(true);\n})();')
html = rep(html, '</style>', '\n' + open(P('future-eras.css'), encoding='utf-8').read() + '\n</style>')

assert html.count('id="future-controls"') == 1 and html.count('era-folder" data-future-concept="') == len(future['concepts'])
assert 'class="next-concept-bar"' not in html and 'class="sample-nav"' not in html
