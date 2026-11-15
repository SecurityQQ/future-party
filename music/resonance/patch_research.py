# ---------- 6c. Research page: eras & forces, constants, 66 changes, party soundtrack, sources ----------
# Executed by build_resonance.py after patch_playback.py; uses html, rep, dump, merged, future, N, P, json, st, add.
hist = json.load(open(P('..', 'history.json'), encoding='utf-8'))
research = {
    'forces': eras['forces'], 'eras': eras['eras'], 'constants': eras['constants'],
    'changes': {'kinds': hist['kinds'], 'records': sorted(hist['records'], key=lambda r: r['year']), 'forecasts': hist['forecasts']},
    'party': {'blocks': st['blocks'], 'tracks': [{k: t.get(k) for k in ('id', 'k', 'b', 'a', 't', 'y', 'd', 'approx', 'p', 'v', 'idea', 'yt')} for t in st['tracks']]},
    'stops': [{'id': t['id'], 'sort': t['sortYear'], 'artist': t['artist'], 'short': t['shortTitle'], 'date': t['date']} for t in merged],
    'links': add['links'], 'signals': sum(len(s['signals']) for s in future['signals']),
}

# Mode switch + routing
html = rep(html, '<a href="#future" id="mode-future" data-mode="future">Future Lab <span>NOW → ?</span></a>',
           '<a href="#future" id="mode-future" data-mode="future">Future Lab <span>NOW → ?</span></a><a href="#research" id="mode-research" data-mode="research">Research <span>13 ERAS</span></a>')
html = rep(html, "$('history-view').hidden=mode!=='history';", "$('history-view').hidden=mode!=='history';$('research-view').hidden=mode!=='research';")
html = rep(html, "const p=new URLSearchParams(location.hash.slice(1));if(p.has('track')){setMode('history');lastSection='history';return;}",
           "const p=new URLSearchParams(location.hash.slice(1));if(p.has('track')){setMode('history');lastSection='history';return;}if(p.has('research')){setMode('research');window.ResonanceResearch?.show();if(!initial&&lastSection!=='research')window.scrollTo({top:0,behavior:'instant'});lastSection='research';document.title='Research — Resonance';return;}")
html = rep(html, "    if(document.body.dataset.view==='future')return;\n    if(document.querySelector('dialog[open]'))return;",
           "    if(document.body.dataset.view!=='history')return;\n    if(document.querySelector('dialog[open]'))return;")
html = rep(html, '<a href="#track=1"><span>01—06</span> The listening history <b>1720—2024</b></a>',
           f'<a href="#track=1"><span>01—{len(add["chapters"]):02d}</span> The listening history <b>1400 BCE—2024</b></a>')
# Radio: the radio script itself listens for resonance:radio {key, from}.

RS_CSS = """
/* Research view: the reasoning behind the route. */
.rs-hero{display:grid;grid-template-columns:1.2fr 1fr;gap:50px;align-items:end;padding:52px 0 36px;border-bottom:1px solid var(--line)}
.rs-hero h1{font:61px/1.03 var(--serif);letter-spacing:-2.9px;margin:20px 0 22px}.rs-hero h1 em{color:var(--accent)}
.rs-hero p:not(.eyebrow){font-size:13px;line-height:1.85;color:#707268;margin:0;max-width:560px}
.rs-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 20px}.rs-stats div{border-top:1px solid var(--line);padding-top:12px}.rs-stats b{display:block;font:34px/1 var(--serif);letter-spacing:-1px}.rs-stats span{font-size:10px;color:var(--muted);letter-spacing:.4px}
.rs-nav{display:flex;flex-wrap:wrap;gap:8px;padding:18px 0;border-bottom:1px solid var(--line)}.rs-nav button{padding:8px 14px;border:1px solid var(--line);border-radius:25px;font-size:10px}.rs-nav button:hover{border-color:var(--accent);color:var(--accent)}
.rs-block{padding:44px 0 10px;scroll-margin-top:20px}
.rs-head{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:22px}.rs-head .eyebrow{font-size:8px;letter-spacing:1.7px;margin:0 0 13px;color:var(--accent)}.rs-head h2{font:36px/1.1 var(--serif);letter-spacing:-1.2px;margin:0}.rs-head>p{font-size:11px;line-height:1.8;color:var(--muted);margin:0;max-width:420px;text-align:right}
.rs-matrix-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:#faf9f3}
.rs-matrix{border-collapse:separate;border-spacing:4px;width:100%;min-width:900px;table-layout:fixed}
.rs-matrix th{font-size:9px;font-weight:500;color:var(--muted);text-align:left;padding:8px 2px 4px;vertical-align:bottom}.rs-matrix th:first-child{width:150px}
.rs-matrix th button{text-align:left;font-size:9px;color:var(--muted);padding:0}.rs-matrix th button b{display:block;font-size:11px;color:var(--ink);font-weight:600;line-height:1.3;margin-top:3px}
.rs-matrix tbody th{font-size:11px;color:var(--ink);font-weight:600;padding:0 8px}.rs-matrix tbody th small{display:block;font-weight:400;font-size:9px;color:var(--muted);margin-top:2px;line-height:1.4}
.rs-matrix td button{display:block;width:100%;height:30px;border-radius:3px;border:1px solid var(--line)}.rs-matrix td button.l1{background:#e6b4a3;border-color:transparent}.rs-matrix td button.l2{background:var(--accent);border-color:transparent}
.rs-legend{display:flex;flex-wrap:wrap;gap:8px 22px;margin:12px 0 0;font-size:11px;color:#696b62}.rs-legend span{display:inline-flex;align-items:center;gap:8px}.rs-legend i{width:13px;height:13px;border-radius:3px;display:inline-block;border:1px solid var(--line)}
.rs-era{display:grid;grid-template-columns:260px minmax(0,1fr);gap:22px 48px;padding:32px 0;border-top:1px solid var(--line);scroll-margin-top:20px}
.rs-era.flash{background:#ece6d6}
.rs-era-years{font-size:11px;color:var(--accent);letter-spacing:.6px}.rs-era h3{font:30px/1.1 var(--serif);letter-spacing:-.8px;margin:8px 0 14px;font-weight:400}
.rs-bars{display:grid;gap:6px}.rs-bar{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:10px;font-size:10px;color:var(--muted)}.rs-bar i{height:5px;border-radius:3px;background:var(--line);display:block}.rs-bar i b{display:block;height:100%;border-radius:3px}.rs-bar i b.l1{width:50%;background:#e6b4a3}.rs-bar i b.l2{width:100%;background:var(--accent)}.rs-bar.on{color:var(--ink)}
.rs-era-body{display:grid;gap:16px;min-width:0}.rs-era-body h4{margin:0;font-size:8px;letter-spacing:1.5px;color:var(--muted);font-weight:650;text-transform:uppercase}.rs-era-body p{margin:6px 0 0;font-size:13px;line-height:1.85;color:#5d6158;max-width:70ch}
.rs-idea{font:italic 22px/1.35 var(--serif)!important;color:var(--ink)!important;margin:0!important}
.rs-works{font-size:12px;line-height:1.8;color:#5d6158}
.rs-stops{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.rs-stops a{font-size:10px;text-decoration:none;padding:6px 10px;border:1px solid var(--line);border-radius:20px;background:#faf9f3}.rs-stops a:hover{border-color:var(--accent);color:var(--accent)}
.rs-src{font-size:10px;color:var(--muted);line-height:1.7}.rs-src a{color:var(--muted)}
.rs-consts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px}.rs-consts div{border-top:2px solid var(--ink);padding-top:12px}.rs-consts b{font:19px/1.2 var(--serif);font-weight:400;display:block}.rs-consts p{font-size:11px;line-height:1.75;color:#696b62;margin:8px 0 0}
.rs-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.rs-filters button{padding:7px 12px;border:1px solid var(--line);border-radius:25px;font-size:10px}.rs-filters button[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.rs-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:#faf9f3}
.rs-table{border-collapse:collapse;width:100%;min-width:900px;font-size:11px}.rs-table th{font-size:8px;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);text-align:left;padding:12px;border-bottom:1px solid var(--line);font-weight:600}.rs-table td{padding:12px;border-bottom:1px solid #e7e7db;vertical-align:top;line-height:1.7;color:#5d6158}.rs-table td.w{white-space:nowrap;color:var(--accent)}.rs-table td.n{color:var(--ink);font-weight:600}.rs-table a{color:var(--accent);text-decoration:none}
.rs-fc{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:18px;margin-top:22px}.rs-fc div{border-top:2px solid var(--accent);padding-top:12px}.rs-fc b{font:18px/1.25 var(--serif);font-weight:400;display:block}.rs-fc p{font-size:11px;line-height:1.75;color:#696b62;margin:8px 0 0}
.rs-party{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.rs-party h3{font:21px/1.2 var(--serif);font-weight:400;margin:0 0 4px}.rs-party small{display:block;font-size:10px;color:var(--muted);margin-bottom:10px}
.rs-party ol{list-style:none;margin:0;padding:0}.rs-party li button{width:100%;text-align:left;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;padding:9px 4px;border-top:1px solid var(--line);font-size:11px;line-height:1.5}.rs-party li button:hover{background:var(--soft)}.rs-party li button span:first-child{color:var(--muted);font-size:10px}.rs-party li button b{font-weight:600;display:block}.rs-party li button i{font-style:normal;color:var(--muted);font-size:10px}.rs-party li button em{font-style:normal;color:var(--accent);font-size:10px}
.rs-party li.voice b{font-style:italic}
.rs-two{display:grid;grid-template-columns:1fr 1fr;gap:40px}.rs-two ul{margin:12px 0 0;padding-left:18px;font-size:11px;line-height:1.85;color:#5d6158}.rs-two a{color:var(--accent)}
@media(max-width:900px){.rs-hero{grid-template-columns:1fr}.rs-era{grid-template-columns:1fr}.rs-consts{grid-template-columns:repeat(2,minmax(0,1fr))}.rs-party{grid-template-columns:1fr}.rs-two{grid-template-columns:1fr}.rs-head{display:block}.rs-head>p{text-align:left;margin-top:10px}}
@media(max-width:620px){.rs-hero h1{font-size:44px;letter-spacing:-2px}.rs-stats{grid-template-columns:repeat(2,1fr)}.rs-consts{grid-template-columns:1fr}.rs-era h3{font-size:26px}}
"""
html = rep(html, '/* Contain decorative horizon orbit without horizontal tablet overflow. */', RS_CSS + '/* Contain decorative horizon orbit without horizontal tablet overflow. */')

RS_HTML = """<section id="research-view" hidden aria-labelledby="research-title" tabindex="-1">
  <div class="rs-hero"><div><p class="eyebrow"><span class="live-dot"></span> THE RESEARCH BEHIND THE ROUTE</p><h1 id="research-title">Why music <em>changes.</em></h1><p>For four thousand years, new music has appeared when one of five forces shifted: who pays for it, who rules, what people believe, what carries the sound, and who meets whom. This page gathers the research behind the route: the forces era by era, the constants, sixty-six core changes, the party soundtrack and the sources. The history tells you what to hear; this tells you why it happened.</p></div><div class="rs-stats" id="rs-stats"></div></div>
  <nav class="rs-nav" aria-label="Research sections" id="rs-nav"></nav>
  <section class="rs-block" id="rs-forces"><div class="rs-head"><div><p class="eyebrow">THE FIVE FORCES, ERA BY ERA</p><h2>Who pays, who rules, what people believe, what carries sound, who meets whom.</h2></div><p>An editorial reading of the eras below. Before 1600 belief and rulers drive most new music; since 1820 every era turns on a new technology. Select a cell to read its era.</p></div><div class="rs-matrix-wrap"><table class="rs-matrix" id="rs-matrix"></table></div><div class="rs-legend"><span><i style="background:var(--accent);border-color:transparent"></i>A main cause</span><span><i style="background:#e6b4a3;border-color:transparent"></i>Present</span><span><i></i>Minor</span></div></section>
  <section class="rs-block" id="rs-eras"><div class="rs-head"><div><p class="eyebrow">THIRTEEN ERAS · 2000 BCE – 2026</p><h2>What was happening, and why people made music.</h2></div><p>Each era links to its stops in the route, so the music plays here.</p></div><div id="rs-era-list"></div></section>
  <section class="rs-block" id="rs-constants"><div class="rs-head"><div><p class="eyebrow">CONSTANTS</p><h2>What never changed.</h2></div></div><div class="rs-consts" id="rs-const-list"></div></section>
  <section class="rs-block" id="rs-changes"><div class="rs-head"><div><p class="eyebrow">THE DATA</p><h2 id="rs-changes-title">Core changes in music.</h2></div><p>Each change altered how music sounds, how it is made, how people hear it, or what it is about. The selection leans toward Western and recorded music.</p></div><div class="rs-filters" id="rs-filters" role="group" aria-label="Filter changes"></div><div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>When</th><th>Change</th><th>Kind</th><th>What changed</th><th>Core idea</th><th>Source</th></tr></thead><tbody id="rs-changes-body"></tbody></table></div><div class="rs-fc" id="rs-forecasts"></div></section>
  <section class="rs-block" id="rs-party"><div class="rs-head"><div><p class="eyebrow">THE PARTY SOUNDTRACK · ABOUT 2 HOURS</p><h2>Twenty-nine tracks and five voices for the 2050 party.</h2></div><p>Chosen for being grounded in reality (a real mission, a 2050-normal technology or a prediction that came true) and for lifting the room. Select any item to start the radio from it.</p></div><div class="rs-party" id="rs-party-list"></div></section>
  <section class="rs-block" id="rs-sources"><div class="rs-head"><div><p class="eyebrow">SOURCES & CAVEATS</p><h2>Where the facts come from.</h2></div></div><div class="rs-two"><div><p class="eyebrow">COMPANIONS & PLAYLISTS</p><ul id="rs-links"></ul><p class="eyebrow" style="margin-top:22px">SOURCES</p><ul id="rs-sources-list"></ul></div><div><p class="eyebrow">WHERE THIS COULD BE WRONG</p><ul><li>Force scores are an editorial reading of the cited sources, not a measurement.</li><li>The eras and changes lean toward Europe and recorded music because those sources survive best; oral traditions left little record.</li><li>Dates before 1000 CE are approximate. Legends are marked as legends (Palestrina saving polyphony, the political charge of “Va, pensiero”).</li><li>Party-soundtrack scores (P = plausibility, I = inspiration) are editorial; durations come from the Apple Music catalogue.</li><li>Forecasts and the 2050 sounds are extrapolations, not predictions from a model or survey.</li></ul></div></div></section>
</section>
"""
html = rep(html, '<section id="future-view" hidden aria-label="Music of the Future">', RS_HTML + '<section id="future-view" hidden aria-label="Music of the Future">')

RS_JS = """
/* Research view: renders the research behind the route from embedded data. */
(() => {
  'use strict';
  const R=JSON.parse(document.getElementById('research-data').textContent);
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const FK=Object.keys(R.forces),LV=['minor','present','a main cause'];
  const yr=y=>y<0?(-y)+' BCE':String(y);
  const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  let rendered=false,kindFilter='all';
  const stopsFor=e=>R.stops.filter(s=>s.sort>=e.from&&s.sort<(e.id==='e13'?2100:e.to));
  function render(){
    if(rendered)return;rendered=true;
    const stats=[[R.eras.length,'eras, 2000 BCE–2026'],[FK.length,'forces'],[R.changes.records.length,'core changes'],[R.constants.length,'constants'],[R.signals,'measured signals'],[R.party.tracks.length,'party tracks & voices']];
    $('rs-stats').innerHTML=stats.map(([n,l])=>`<div><b>${n}</b><span>${esc(l)}</span></div>`).join('');
    const nav=[['rs-forces','Forces'],['rs-eras','Eras'],['rs-constants','Constants'],['rs-changes','Core changes'],['rs-party','Party soundtrack'],['rs-sources','Sources']];
    $('rs-nav').innerHTML=nav.map(([id,l])=>`<button data-rs-go="${id}">${l}</button>`).join('')+'<button onclick="location.hash=\\'future=signals\\'">Signals now ↗</button>';
    $('rs-matrix').innerHTML='<thead><tr><th>Force</th>'+R.eras.map(e=>`<th><button data-rs-era="${e.id}">${esc(yr(e.from))}<b>${esc(e.short)}</b></button></th>`).join('')+'</tr></thead><tbody>'+
      FK.map(k=>'<tr><th>'+esc(R.forces[k].name)+'<small>'+esc(R.forces[k].hint)+'</small></th>'+R.eras.map(e=>{const v=e.forces[k];return `<td><button class="l${v}" data-rs-era="${e.id}" title="${esc(R.forces[k].name+' · '+e.years+' '+e.name+': '+LV[v])}" aria-label="${esc(R.forces[k].name+', '+e.name+': '+LV[v])}"></button></td>`;}).join('')+'</tr>').join('')+'</tbody>';
    $('rs-era-list').innerHTML=R.eras.map(e=>{const stops=stopsFor(e);
      return `<article class="rs-era" id="rs-${e.id}"><div><div class="rs-era-years">${esc(e.years)}</div><h3>${esc(e.name)}</h3><div class="rs-bars">${FK.map(k=>{const v=e.forces[k];return `<div class="rs-bar${v===2?' on':''}"><span>${esc(R.forces[k].name)}</span><i><b class="l${v}"></b></i></div>`;}).join('')}</div></div>
      <div class="rs-era-body"><div><h4>What was happening</h4><p>${esc(e.context)}</p></div><div><h4>Why music was made</h4><p>${esc(e.why)}</p></div><p class="rs-idea">“${esc(e.idea)}”</p>
      <div><h4>Works</h4><p class="rs-works">${e.works.map(w=>`${esc(w.t)} <span style="color:var(--muted)">· ${esc(w.by)} — ${esc(w.note)}</span>`).join('<br>')}</p></div>
      ${stops.length?`<div><h4>Listen in the route · plays here</h4><div class="rs-stops">${stops.map(s=>`<a href="#track=${s.id}">${esc(s.date)} · ${esc(s.artist)} — ${esc(s.short)}</a>`).join('')}</div></div>`:''}
      <div class="rs-src">Sources: ${e.src.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(decodeURIComponent(u.split('/').pop()).replace(/_/g,' '))}</a>`).join(' · ')}</div></div></article>`;}).join('');
    $('rs-const-list').innerHTML=R.constants.map(c=>`<div><b>${esc(c.t)}</b><p>${esc(c.x)}</p></div>`).join('');
    $('rs-changes-title').textContent=`${R.changes.records.length} core changes in music, from bone flutes to AI.`;
    const kinds=[['all','All'],...Object.entries(R.changes.kinds)];
    const renderChanges=()=>{
      $('rs-filters').innerHTML=kinds.map(([k,l])=>`<button data-rs-kind="${k}" aria-pressed="${k===kindFilter}">${esc(l)} <span style="opacity:.6">${k==='all'?R.changes.records.length:R.changes.records.filter(r=>r.kind===k).length}</span></button>`).join('');
      $('rs-changes-body').innerHTML=R.changes.records.filter(r=>kindFilter==='all'||r.kind===kindFilter).map(r=>`<tr><td class="w">${esc(r.when)}</td><td class="n">${esc(r.title)}</td><td>${esc(R.changes.kinds[r.kind])}</td><td>${esc(r.change)}</td><td>${esc(r.idea)}</td><td><a href="${esc(r.src)}" target="_blank" rel="noopener noreferrer">Source ↗</a></td></tr>`).join('');
    };
    renderChanges();
    $('rs-filters').addEventListener('click',e=>{const b=e.target.closest('[data-rs-kind]');if(b){kindFilter=b.dataset.rsKind;renderChanges();}});
    $('rs-forecasts').innerHTML='<div style="grid-column:1/-1;border:0;padding:0"><p class="eyebrow" style="color:var(--accent)">WHERE THE LINES POINT BY 2050 · EDITORIAL</p></div>'+R.changes.forecasts.map(f=>`<div><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div>`).join('');
    const T=R.party.tracks;let k=0;
    $('rs-party-list').innerHTML=R.party.blocks.map(b=>{const items=T.map((t,i)=>({t,i})).filter(x=>x.t.b===b.n);const mins=Math.round(items.reduce((s,x)=>s+x.t.d,0)/60);
      return `<div><h3>${b.n}. ${esc(b.t)}</h3><small>${mins} min · ${esc(b.sync)}</small><ol>${items.map(({t,i})=>`<li class="${t.k==='voice'?'voice':''}"><button data-rs-party="${i}" title="Play from here in Resonance Radio"><span>${t.k==='voice'?'voice':String(++k).padStart(2,'0')}</span><span><b>${esc(t.t)}</b><i>${esc(t.a)} · ${t.y}${t.k==='voice'?'':' · P '+t.p+' · I '+t.v}</i></span><em>${t.approx?'≈':''}${mmss(t.d)} ▶</em></button></li>`).join('')}</ol></div>`;}).join('');
    const L=R.links;
    $('rs-links').innerHTML=[[L.routePlaylist,'YouTube playlist: History of Music, 2000 BCE → 2050 (private)'],[L.soundtrackPlaylist,'YouTube playlist: Soundtrack 2050 · party running order (private)'],[L.whyPage,'Why Music Changes (companion page)'],[L.soundtrackPage,'Soundtrack 2050 (companion page)']].map(([u,l])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(l)} ↗</a></li>`).join('');
    const seen=new Set(),src=[];R.eras.forEach(e=>e.src.forEach(u=>{if(!seen.has(u)){seen.add(u);src.push(u);}}));R.changes.records.forEach(r=>{if(!seen.has(r.src)){seen.add(r.src);src.push(r.src);}});
    $('rs-sources-list').innerHTML=src.map(u=>`<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(decodeURIComponent(u.replace(/^https?:\\/\\/(www\\.)?/,'').replace(/^en\\.wikipedia\\.org\\/wiki\\//,'Wikipedia: ')).replace(/_/g,' '))}</a></li>`).join('');
  }
  document.addEventListener('click',e=>{
    const go=e.target.closest('[data-rs-go]');if(go){$(go.dataset.rsGo)?.scrollIntoView({behavior:'smooth'});return;}
    const era=e.target.closest('[data-rs-era]');if(era){const n=$('rs-'+era.dataset.rsEra);if(n){n.scrollIntoView({behavior:'smooth'});n.classList.add('flash');setTimeout(()=>n.classList.remove('flash'),1600);}return;}
    const p=e.target.closest('[data-rs-party]');if(p){document.dispatchEvent(new CustomEvent('resonance:radio',{detail:{key:'party',from:Number(p.dataset.rsParty)}}));}
  });
  window.ResonanceResearch={show:render};
  if(new URLSearchParams(location.hash.slice(1)).has('research'))render();
})();
"""
html = rep(html, '<script id="future-data" type="application/json">', '<script id="research-data" type="application/json">' + dump(research) + '</script>\n<script id="future-data" type="application/json">')
html = rep(html, "\n/* Resonance Radio: one embedded", "\n" + RS_JS + "\n/* Resonance Radio: one embedded")
html = rep(html, '<h3>Music of the Future</h3>', '<h3>Research</h3><p>The Research tab gathers the reasoning behind the route: five forces scored across thirteen eras from 2000 BCE to 2026, constants, 66 core changes in music with sources, editorial forecasts for 2050 and the party soundtrack, which plays in Resonance Radio.</p><h3>Music of the Future</h3>')
