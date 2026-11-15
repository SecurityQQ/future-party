"""Compact History: pick a period/recording, then watch and read its context.

Run after the shared theme and visible brand renaming. Existing data, search,
bookmarks, keyboard routes and continuous playback remain the source of truth.
"""
from html import escape as escape_html

history_data_before = {match[1]: match[2] for match in re.finditer(
    r'<script id="([^"]+)" type="application/json">(.*?)</script>', html, re.S)}

# Eras are glass folders (era-browser.css/js): art on the back panel, sheets in the
# pocket, a frosted front on a bottom hinge. Paths are fixed px, as clip-path needs.
FOLDER_W, BACK_H, FRONT_H = 156, 104, 70
BACK_PATH = (f'M0 20a12 12 0 0 1 12-12h{FOLDER_W - 88}c11 0 13-8 24-8h40a12 12 0 0 1 12 12'
             f'v{BACK_H - 24}a12 12 0 0 1-12 12H12A12 12 0 0 1 0 {BACK_H - 12}Z')
FRONT_PATH = (f'M0 12a12 12 0 0 1 12-12h50c11 0 13 8 24 8h{FOLDER_W - 98}a12 12 0 0 1 12 12'
              f'v{FRONT_H - 32}a12 12 0 0 1-12 12H12A12 12 0 0 1 0 {FRONT_H - 12}Z')
def glass_folder(i, attr, top, name, count, controls):
    """One era-style glass folder button; Music of the Future reuses it for its directions."""
    return (
        f'<button type="button" class="history-period era-folder" data-{attr}="{i}" aria-pressed="false" aria-controls="{controls}" style="--i:{i}">'
        f'<span class="era-back" style="clip-path:path(\'{BACK_PATH}\')" aria-hidden="true"><canvas class="era-art" width="1" height="1" data-era-art></canvas><span class="era-back-sheen"></span></span>'
        f'<svg class="era-back-rim" viewBox="0 0 {FOLDER_W} {BACK_H}" aria-hidden="true" focusable="false"><path d="{BACK_PATH}"/></svg>'
        '<span class="era-files" aria-hidden="true"><i></i><i></i><i></i></span>'
        f'<span class="era-front" style="clip-path:path(\'{FRONT_PATH}\')"><span class="era-tint" aria-hidden="true"></span><span class="era-spec" aria-hidden="true"></span>'
        f'<svg class="era-front-rim" viewBox="0 0 {FOLDER_W} {FRONT_H}" aria-hidden="true" focusable="false"><path d="{FRONT_PATH}"/></svg>'
        f'<span class="era-label"><span class="history-period-range">{escape_html(top)}</span><span class="history-period-name">{escape_html(name)}</span></span>'
        f'<span class="era-count">{count:02d}<span class="history-visually-hidden"> {"recording" if count == 1 else "recordings"}</span></span></span></button>')


era_counts = [sum(1 for t in merged if t['chapter'] == i) for i in range(len(add['chapters']))]
period_buttons = ''.join(glass_folder(i, 'history-period', chapter['range'], chapter['short'], era_counts[i], 'history-recording story')
                         for i, chapter in enumerate(add['chapters']))
rim_defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
            '<linearGradient id="era-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="#dce9fb" stop-opacity=".26"/><stop offset="1" stop-color="#dce9fb" stop-opacity=".1"/></linearGradient>'
            '<linearGradient id="era-rim-on" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#9dd8ff" stop-opacity=".7"/><stop offset="1" stop-color="#4385ff" stop-opacity=".35"/></linearGradient>'
            '</defs></svg>')
controls = f'''<section class="history-controls" aria-label="Choose an era and a recording">
  <h1 class="history-visually-hidden">Music history</h1>
  <div class="era-picker"><span id="history-period-label" class="history-visually-hidden">Eras</span><button id="history-period-earlier" class="icon-button era-scroll era-scroll-prev" aria-label="Scroll to earlier eras">←</button><div id="history-period" class="era-strip" role="group" aria-labelledby="history-period-label">{period_buttons}</div><button id="history-period-later" class="icon-button era-scroll era-scroll-next" aria-label="Scroll to later eras">→</button></div>
  <div class="recordings">
    <div class="recordings-head"><p class="recordings-title" id="history-recording-label"><span>In this era</span><b id="history-era-name"></b><span id="history-era-position"></span></p>
    <div class="history-step-controls" aria-label="Move through the full history route"><button id="history-previous" class="icon-button" aria-label="Previous recording">←</button><output id="history-position" class="era-position" aria-live="polite" aria-atomic="true">01 / {N}</output><button id="history-next" class="icon-button" aria-label="Next recording">→</button></div></div>
    <div id="history-recording" class="molten" aria-controls="story"><canvas tabindex="0" role="listbox" aria-labelledby="history-recording-label"></canvas><p class="molten-hint" aria-hidden="true">drag · swipe · ← →</p></div>
  </div>
</section>'''

intro = re.search(r'<section class="intro" aria-labelledby="page-title">.*?</section>', html, re.S)
assert intro, 'Expected the original History hero'
html = html[:intro.start()] + controls + html[intro.end():]
html = rep(html, '<div id="history-view">', rim_defs + '\n<div id="history-view">')
# The old nodes retain the established listeners and listened-state hooks, but
# are absent from both the visual layout and keyboard/accessibility tree.
html = rep(html, '<section class="journey" aria-label="Music history timeline">',
           '<section class="journey history-legacy" aria-label="Music history timeline" hidden>')
html = rep(html, '<div class="selected-label">', '<div class="selected-label" hidden>')
html = rep(html, '<button id="previous" class="step-button">', '<button id="previous" class="step-button" hidden>')
html = rep(html, '<button id="next" class="step-button next-button">', '<button id="next" class="step-button next-button" hidden>')

# The player comes first in document/keyboard order as well as in the mobile grid.
columns = re.search(r'(<div class="story-grid">\s*)(<article class="story-text">.*?</article>)\s*(<aside class="listening-panel".*?</aside>)', html, re.S)
assert columns, 'Expected one story and listening column'
html = html[:columns.start()] + columns[1] + columns[3] + '\n' + columns[2] + html[columns.end():]

choices_js = r'''  function renderHistoryChoices() {
    const track=tracks[current-1];
    $('history-period').querySelectorAll('[data-history-period]').forEach(button=>{
      const active=Number(button.dataset.historyPeriod)===track.chapter;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
    requestAnimationFrame(()=>centerHistoryPeriod());
    const inEra=tracks.filter(item=>item.chapter===track.chapter);
    $('history-era-name').textContent=chapters[track.chapter].name;
    $('history-era-position').textContent=`${pad(inEra.indexOf(track)+1)} / ${pad(inEra.length)}`;
    try{eras?.update(track.chapter,inEra.indexOf(track));}catch(error){console.warn('History eras could not update',error);}
    $('history-position').textContent=`${pad(current)} / ${tracks.length}`;
    $('history-position').setAttribute('aria-label',`Recording ${current} of ${tracks.length}`);
    for(const [id,step] of [['history-previous',-1],['history-next',1]]){
      const target=tracks[current-1+step],button=$(id);
      button.disabled=!target;
      button.setAttribute('aria-label',target?`${step<0?'Previous':'Next'}: ${target.artist}, ${target.shortTitle}`:`${step<0?'First':'Last'} recording`);
    }
  }
  function updateHistoryPeriodScroll() {
    const strip=$('history-period');
    $('history-period-earlier').disabled=strip.scrollLeft<=2;
    $('history-period-later').disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;
    strip.classList.toggle('can-earlier',!$('history-period-earlier').disabled);strip.classList.toggle('can-later',!$('history-period-later').disabled);
  }
  function centerHistoryPeriod(smooth=true) {
    if(document.body.dataset.view!=='history')return;
    const strip=$('history-period'),active=strip.querySelector('.active');
    if(!active)return;
    strip.scrollTo({left:active.offsetLeft-(strip.clientWidth-active.offsetWidth)/2,behavior:smooth&&!reducedMotion?'smooth':'instant'});
    updateHistoryPeriodScroll();
  }
  function prepareHistoryPlayer() {
    // Hosted copies expose the actual YouTube player immediately, without sound.
    // Local/downloaded copies retain the existing on-demand relay behavior.
    if(LOCAL||document.body.dataset.view!=='history'||!$('embed-container').hidden||!tracks[current-1].videoId)return;
    play(false,{autoplay:false});
  }
'''
html = rep(html, '  function render({smooth=true}={}) {', choices_js + '  function render({smooth=true}={}) {')
html = rep(html, '    updateProgress(); requestAnimationFrame(()=>centerTimeline(smooth));',
           '    updateProgress(); renderHistoryChoices(); requestAnimationFrame(prepareHistoryPlayer);')

listeners = r'''  $('history-period').addEventListener('click',event=>{
    const button=event.target.closest('[data-history-period]');if(!button)return;
    const first=tracks.find(track=>track.chapter===Number(button.dataset.historyPeriod));
    if(first)select(first.id,{smooth:false});
  });
  $('history-period').addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    const button=event.target.closest('[data-history-period]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const chapter=Number(button.dataset.historyPeriod)+(event.key==='ArrowRight'?1:-1);
    const next=$('history-period').querySelector(`[data-history-period="${chapter}"]`);
    if(next){next.focus({preventScroll:true});next.click();}
  });
  $('history-period').addEventListener('scroll',updateHistoryPeriodScroll,{passive:true});
  for(const [id,direction] of [['history-period-earlier',-1],['history-period-later',1]]){
    $(id).addEventListener('click',()=>{$('history-period').scrollBy({left:direction*Math.max(180,$('history-period').clientWidth*.7),behavior:reducedMotion?'instant':'smooth'});});
  }
  window.addEventListener('resize',()=>centerHistoryPeriod(false));
  // The eras and the ring are decoration over select(): if they fail, History still works.
  let eras=null;
  const eraTracks=chapters.map((_,i)=>tracks.filter(t=>t.chapter===i));
  try{eras=window.ResonanceEras?.mount({root:$('history-recording'),strip:$('history-period'),groups:eraTracks.map(list=>list.map(t=>({seed:t.id*13+1,date:t.date,genre:t.genre,artist:t.artist,title:t.shortTitle||t.title}))),reducedMotion,label:'Recordings in this era',onSelect:(g,i)=>select(eraTracks[g][i].id,{smooth:false})})||null;}catch(error){console.warn('History eras could not start',error);}
  $('history-previous').addEventListener('click',()=>select(current-1,{smooth:false}));
  $('history-next').addEventListener('click',()=>select(current+1,{smooth:false}));
'''
html = rep(html, "  $('previous').addEventListener('click',()=>select(current-1,{scrollStory:true}));",
           listeners + "  $('previous').addEventListener('click',()=>select(current-1,{scrollStory:true}));")

# Reuse the established player lifecycle and error/continuous handlers for a
# paused preview. No separate iframe can keep playing behind another view.
play_start = html.index('  function play(full=false) {')
play_end = html.index('  function openSearch(', play_start)
play_code = html[play_start:play_end]
play_code = rep(play_code, '  function play(full=false) {', '  function play(full=false,{autoplay=true}={}) {')
play_code = rep(play_code,
    "cleanPlayer(); const generation=playerGeneration; lastFull=full; document.dispatchEvent(new CustomEvent('resonance:play',{detail:'history'}));",
    "cleanPlayer(); const generation=playerGeneration; lastFull=full; if(autoplay)document.dispatchEvent(new CustomEvent('resonance:play',{detail:'history'}));")
play_code = rep(play_code, "{autoplay:'1',playsinline:'1'", "{autoplay:autoplay?'1':'0',playsinline:'1'")
play_code = rep(play_code,
    "$('player-status').textContent=full?'Loading the full recording…':'Loading a 90-second introduction. Use “Full recording” to continue.';",
    "$('player-status').textContent=autoplay?(full?'Loading the full recording…':'Loading a 90-second introduction. Use “Full recording” to continue.'):'Press play in the video, or choose a sample below.';")
play_code = rep(play_code,
    "if(event.data===1){hasPlayed=true;clearTimeout(apiSlowTimer);",
    "if(event.data===1){hasPlayed=true;document.dispatchEvent(new CustomEvent('resonance:play',{detail:'history'}));clearTimeout(apiSlowTimer);")
# A blocked paused preview must not silently skip through an armed continuous queue.
play_code = rep(play_code, 'if(autoNext&&current<tracks.length)', 'if(autoNext&&(autoplay||hasPlayed)&&current<tracks.length)', 2)
html = html[:play_start] + play_code + html[play_end:]

# A single-current-track route can be revisited after another player stopped it.
# Cue only after setMode has made History visible; never while Future/Research loads.
html = rep(html, "if(mode==='future'){window.ResonanceHistory?.cleanPlayer();}else{cleanup();}",
           "if(mode!=='history')window.ResonanceHistory?.cleanPlayer();if(mode!=='future')cleanup();")
# Keep preview available to the existing journey mode switch without changing routes.
html = rep(html, "if(current===id && history) {if(scrollStory)$('story').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});return;}",
           "if(current===id && history) {requestAnimationFrame(prepareHistoryPlayer);if(scrollStory)$('story').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});return;}")
html = rep(html, 'window.ResonanceHistory={select,cleanPlayer,getCurrent:()=>current};',
           'window.ResonanceHistory={select,cleanPlayer,prepare:prepareHistoryPlayer,getCurrent:()=>current};')
html = rep(html, "if(location.hash===`#track=${id}`)setMode('history');else location.hash=`track=${id}`;",
           "if(location.hash===`#track=${id}`){setMode('history');window.ResonanceHistory?.prepare();}else location.hash=`track=${id}`;")

# Match copy to the immediately visible hosted preview. Relay copy is unchanged.
html = rep(html, "'YouTube loads only when you choose to play.'", "'Press play in the video, or choose a sample below.'")
html = rep(html, '<p id="player-status" class="player-status" aria-live="polite">YouTube loads only when you choose to play.</p>',
           '<p id="player-status" class="player-status" aria-live="polite">Press play in the video, or choose a sample below.</p>')
html = rep(html, 'Select a chapter or timeline stop.', 'Choose a period and recording.')
html = rep(html, 'Recordings play through YouTube. Nothing is downloaded, and the app does not contact YouTube until you press play. When opened as a local HTML file, playback opens on YouTube. Serve the app over HTTP or HTTPS to use the in-page player.',
           'Recordings play through YouTube. Hosted History pages load a paused video preview when you choose a recording; sound starts when you press Play. Downloaded copies load their player on demand. Recordings are streamed, not downloaded.')
html = rep(html, '</style>', '\n' + open(P('history-layout.css'), encoding='utf-8').read() + '\n' + open(P('era-browser.css'), encoding='utf-8').read() + '\n</style>')
html = rep(html, '<script>/* Resonance: framework-free', '<script>\n' + open(P('era-browser.js'), encoding='utf-8').read() + '</script>\n<script>/* Resonance: framework-free')

history_data_after = {match[1]: match[2] for match in re.finditer(
    r'<script id="([^"]+)" type="application/json">(.*?)</script>', html, re.S)}
assert history_data_after == history_data_before, 'History layout must preserve all source data'
assert 'Hear what <em>changed.</em>' not in html
assert html.count('id="history-period"') == html.count('id="history-recording"') == 1
