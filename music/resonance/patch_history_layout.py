"""Compact History: pick a period/recording, then watch and read its context.

Run after the shared theme and visible brand renaming. Existing data, search,
bookmarks, keyboard routes and continuous playback remain the source of truth.
"""
from html import escape as escape_html

history_data_before = {match[1]: match[2] for match in re.finditer(
    r'<script id="([^"]+)" type="application/json">(.*?)</script>', html, re.S)}

period_buttons = ''.join(
    f'<button type="button" class="history-period" data-history-period="{i}" aria-pressed="false" aria-controls="history-recording story"><span class="history-period-range">{escape_html(chapter["range"])}</span><span class="history-period-point" aria-hidden="true"><i></i></span><span class="history-period-name">{escape_html(chapter["short"])}</span></button>'
    for i, chapter in enumerate(add['chapters'])
)
controls = f'''<section class="history-controls" aria-label="Choose a period and recording">
  <h1 class="history-visually-hidden">Music history</h1>
  <div class="history-period-picker"><div class="history-period-heading"><span id="history-period-label">Period</span><div class="history-period-scroll"><button id="history-period-earlier" class="icon-button" aria-label="Scroll to earlier periods">←</button><button id="history-period-later" class="icon-button" aria-label="Scroll to later periods">→</button></div></div><div id="history-period" class="history-period-strip" role="group" aria-labelledby="history-period-label">{period_buttons}</div></div>
  <div class="history-field history-recording-field"><label for="history-recording">Recording</label><select id="history-recording" aria-controls="story"></select></div>
  <div class="history-step-controls" aria-label="Move through the full history route"><button id="history-previous" class="icon-button" aria-label="Previous recording">←</button><output id="history-position" aria-live="polite" aria-atomic="true">01 / {N}</output><button id="history-next" class="icon-button" aria-label="Next recording">→</button></div>
</section>'''

intro = re.search(r'<section class="intro" aria-labelledby="page-title">.*?</section>', html, re.S)
assert intro, 'Expected the original History hero'
html = html[:intro.start()] + controls + html[intro.end():]
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
    $('history-recording').innerHTML=tracks.filter(item=>item.chapter===track.chapter).map(item=>
      `<option value="${item.id}">${esc(item.date)} · ${esc(item.artist)} — ${esc(item.shortTitle)}</option>`).join('');
    $('history-recording').value=String(current);
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
  $('history-recording').addEventListener('change',event=>select(Number(event.target.value),{smooth:false}));
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
html = rep(html, '</style>', '\n' + open(P('history-layout.css'), encoding='utf-8').read() + '\n</style>')

history_data_after = {match[1]: match[2] for match in re.finditer(
    r'<script id="([^"]+)" type="application/json">(.*?)</script>', html, re.S)}
assert history_data_after == history_data_before, 'History layout must preserve all source data'
assert 'Hear what <em>changed.</em>' not in html
assert html.count('id="history-period"') == html.count('id="history-recording"') == 1
