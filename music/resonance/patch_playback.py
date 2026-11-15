# ---------- 6b. In-page playback: continuous stops + Resonance Radio ----------
# Executed by build_resonance.py (exec) with html, rep, dump, merged, future, N, P, json in scope.
WEB = add['links']['web']; WEB_HOST = WEB.split('//')[1]
st = json.load(open(P('..', 'soundtrack.json'), encoding='utf-8'))
def _item(vid, artist, title, when, stop=None):
    d = {'id': vid, 'label': f'{artist} — {title}', 'when': str(when or '')}
    if stop: d['stop'] = stop
    return d
radio = {
    'route': {'title': f'History route · {N}', 'items': [_item(t['videoId'], t['artist'], t['shortTitle'], t.get('date') or t.get('year'), t['id']) for t in merged]},
    'future': {'title': f'Future Lab · {len(future["works"])}', 'items': [_item(w['videoId'], w['artist'], w['title'], w.get('year')) for w in future['works']]},
    'party': {'title': f'Party soundtrack · {len(st["tracks"])}', 'items': [_item(t['yt'], t['a'], t['t'], t.get('y')) for t in st['tracks']]},
}
# History player: announce playback, remember the mode, auto-advance when a recording ends.
html = rep(html, "    cleanPlayer(); const generation=playerGeneration;\n",
           "    cleanPlayer(); const generation=playerGeneration; lastFull=full; document.dispatchEvent(new CustomEvent('resonance:play',{detail:'history'}));\n")
html = rep(html, "let toastTimer, apiSlowTimer, resetArmed=false;",
           "let toastTimer, apiSlowTimer, resetArmed=false, autoNext=false, lastFull=false;")
html = rep(html, "            if(event.data===0)$('player-status').textContent=full?'Recording finished. Continue exploring whenever you’re ready.':'Sample finished. Choose “Full recording” to hear more.';",
           "            if(event.data===0){$('player-status').textContent=full?'Recording finished. Continue exploring whenever you’re ready.':'Sample finished. Choose “Full recording” to hear more.';if(autoNext&&current<tracks.length){$('player-status').textContent='Continuous play: moving to the next stop…';setTimeout(()=>{if(generation!==playerGeneration)return;select(current+1);play(lastFull);},900);}}")
html = rep(html, '<button id="play-full" class="secondary-button">Full recording <span aria-hidden="true">↗</span></button></div>',
           '<button id="play-full" class="secondary-button">Full recording <span aria-hidden="true">↗</span></button><button id="auto-next" class="secondary-button" aria-pressed="false" title="When a recording ends, go to the next stop and keep playing">⟳ Continuous: off</button></div>')
html = rep(html, "$('play-sample').addEventListener('click',()=>play(false));",
           "$('auto-next').addEventListener('click',()=>{autoNext=!autoNext;$('auto-next').setAttribute('aria-pressed',String(autoNext));$('auto-next').textContent=autoNext?'⟳ Continuous: on':'⟳ Continuous: off';toast(autoNext?'Continuous play on: each stop leads into the next.':'Continuous play off.');});document.addEventListener('resonance:play',e=>{if(e.detail!=='history')cleanPlayer();});\n  $('play-sample').addEventListener('click',()=>play(false));")
html = rep(html, "const myGeneration=generation,start=w.start||0",
           "document.dispatchEvent(new CustomEvent('resonance:play',{detail:'future'}));const myGeneration=generation,start=w.start||0")
html = rep(html, "document.addEventListener('resonance:history',()=>setMode('history'));",
           "document.addEventListener('resonance:history',()=>setMode('history'));document.addEventListener('resonance:play',e=>{if(e.detail!=='future')cleanup();});")
html = rep(html, "(FRAMED?'Playback opens on YouTube in a new tab.':'Local preview: playback opens on YouTube. Run the included server for the in-page player.')",
           f"'Press play to listen here. In this copy the player loads from {WEB_HOST}.'")
html = rep(html, "(FRAMED?'Playback opens on YouTube in a new tab.':'Local file: playback opens on YouTube. Serve this app for the in-page player.')",
           f"'Press play to listen here. In this copy the player loads from {WEB_HOST}.'")

html = rep(html, "            $('player-status').textContent=(messages[event.data]||'YouTube could not play this video.')+' Use “Open on YouTube” or “Find another recording” below.';",
           "            $('player-status').textContent=(messages[event.data]||'YouTube could not play this video.')+' Use “Open on YouTube” or “Find another recording” below.';\n            if(autoNext&&current<tracks.length){$('player-status').textContent+=' Continuous play: skipping to the next stop…';setTimeout(()=>{if(generation!==playerGeneration)return;select(current+1);play(lastFull);},2500);}")

RADIO_CSS = """
/* Resonance Radio: a docked YouTube player for whole lists. */
.player-actions{flex-wrap:wrap}
.radio-open{position:fixed;right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:14;background:var(--ink);color:var(--paper);border-radius:30px;padding:13px 18px;font-size:12px;font-weight:600;box-shadow:0 8px 24px #0003}
.radio-open:hover{background:var(--accent)}
.radio{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:16;width:min(460px,calc(100% - 32px));background:var(--dark);color:var(--paper);border-radius:8px;box-shadow:0 20px 60px #0005;overflow:hidden}
.radio-bar{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #45473d}.radio-bar .eyebrow{font-size:9px;color:#b6b9a6;margin-right:auto}
.radio-bar .icon-button{color:var(--paper);border-color:#575c49}
.radio-lists{display:flex;gap:6px;flex-wrap:wrap;padding:12px 14px 0}.radio-lists button{font-size:10px;padding:7px 10px;border:1px solid #575c49;border-radius:20px;color:#e2e3d5}.radio-lists button[aria-pressed=true]{background:var(--paper);color:var(--ink);border-color:var(--paper)}
.radio-frame{aspect-ratio:16/9;margin:12px 14px 0;background:#111;border-radius:4px;overflow:hidden}.radio-frame iframe{width:100%;height:100%;border:0;display:block}
.radio-now{display:flex;align-items:center;gap:8px;margin:12px 14px 0}.radio-now p{margin:0 auto 0 0;font-size:12px;line-height:1.4;color:var(--paper);min-width:0}.radio-now small{display:block;font-size:9px;letter-spacing:.08em;color:#9b9f8d;text-transform:uppercase}
.radio-now button{border:1px solid #575c49;border-radius:20px;color:#e2e3d5;font-size:12px;padding:6px 10px}.radio-now button:hover{border-color:var(--paper)}
.radio-queue{margin:10px 14px 0;max-height:150px;overflow:auto;border-top:1px solid #45473d;padding:6px 0 0;list-style:none}.radio-queue li button{display:flex;gap:8px;width:100%;text-align:left;font-size:11px;line-height:1.4;color:#c9cbbd;padding:5px 2px}.radio-queue li button span{color:#80846f;min-width:22px}.radio-queue li button:hover{color:var(--paper)}.radio-queue li[aria-current=true] button{color:var(--paper);font-weight:600}.radio-queue li.failed button{color:#80846f;text-decoration:line-through}
.radio-note{font-size:10px;line-height:1.6;color:#9b9f8d;margin:10px 14px 14px}
@media print{.radio,.radio-open{display:none!important}}
"""
html = rep(html, '/* Contain decorative horizon orbit without horizontal tablet overflow. */',
           RADIO_CSS + '/* Contain decorative horizon orbit without horizontal tablet overflow. */')

RADIO_HTML = """<button id="radio-open" class="radio-open">▶ Resonance Radio</button>
<section id="radio" class="radio" hidden aria-label="Resonance Radio"><div class="radio-bar"><span class="eyebrow">RESONANCE RADIO · PLAYS HERE</span><button id="radio-close" class="icon-button" aria-label="Close the radio">×</button></div><div class="radio-lists" id="radio-lists" role="group" aria-label="Choose what to play"></div><div class="radio-frame" id="radio-frame"></div><div class="radio-now"><p id="radio-title" aria-live="polite"></p><button id="radio-prev" aria-label="Previous">⏮</button><button id="radio-next" aria-label="Next">⏭</button><button id="radio-queue-toggle" aria-expanded="false" aria-controls="radio-queue">List</button></div><ol class="radio-queue" id="radio-queue" hidden></ol><p class="radio-note" id="radio-note"></p></section>
<div id="toast" role="status" aria-live="polite"></div>"""
html = rep(html, '<div id="toast" role="status" aria-live="polite"></div>', RADIO_HTML)

RADIO_JS = """
/* Resonance Radio: one embedded YouTube player that plays a whole list in order. */
(() => {
  'use strict';
  const LISTS=__RADIO_JSON__;
  const $=id=>document.getElementById(id);
  const FRAMED=(()=>{try{return window.self!==window.top}catch{return true}})();
  const LOCAL=!/^https?:$/.test(location.protocol)||FRAMED;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current='route',index=0,player=null,ready=false,generation=0,state=-1,failed=new Set(),skipTimer=0,apiPromise=null;
  const openExternal=url=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();};
  const items=()=>LISTS[current].items;
  function loadAPI(){
    if(window.YT?.Player)return Promise.resolve(window.YT);if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{const old=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(typeof old==='function')old();resolve(window.YT);};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.onerror=()=>{apiPromise=null;reject(new Error('YouTube API unavailable'));};document.head.appendChild(s);});
    return apiPromise;
  }
  function renderLists(){$('radio-lists').innerHTML=Object.entries(LISTS).map(([k,l])=>`<button data-radio="${k}" aria-pressed="${k===current}">${esc(l.title)}</button>`).join('');}
  function renderNow(){
    const list=items(),it=list[index];if(!it)return;
    $('radio-title').innerHTML=`<small>${index+1} / ${list.length}${it.when?' · '+esc(it.when):''}</small>${esc(it.label)}`;
    $('radio-queue').innerHTML=list.map((x,i)=>`<li${i===index?' aria-current="true"':''}${failed.has(current+':'+i)?' class="failed"':''}><button data-at="${i}"><span>${i+1}</span>${esc(x.label)}</button></li>`).join('');
    $('radio-queue').querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest'});
  }
  function stop(){generation++;clearTimeout(skipTimer);try{player?.destroy();}catch{}player=null;ready=false;state=-1;$('radio-frame').replaceChildren();}
  function go(i){
    const list=items();if(i<0||i>=list.length){$('radio-note').textContent='End of the list. Choose a list to start again.';return;}
    index=i;clearTimeout(skipTimer);renderNow();
    if(player&&ready){player.loadVideoById(list[i].id);}
  }
  function start(key,from=0){
    current=key;index=Math.max(0,Math.min(from,LISTS[key].items.length-1));renderLists();
    const ids=items().map(x=>x.id).slice(index);
    if(LOCAL){openExternal('https://www.youtube.com/watch_videos?video_ids='+ids.slice(0,50).join(','));renderNow();$('radio-note').innerHTML='This copy cannot embed YouTube, so the list opened on YouTube (first 50 videos). <a href="__WEB__/" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">Open __WEB_HOST__</a> to play every list inside the page.';return;}
    document.dispatchEvent(new CustomEvent('resonance:play',{detail:'radio'}));
    stop();const my=generation;renderNow();
    const host=document.createElement('div');$('radio-frame').append(host);
    $('radio-note').textContent='Connecting to YouTube…';
    loadAPI().then(YT=>{
      if(my!==generation)return;
      player=new YT.Player(host,{host:'https://www.youtube-nocookie.com',videoId:items()[index].id,playerVars:{autoplay:1,playsinline:1,rel:0,origin:location.origin},
        events:{
          onReady:e=>{if(my!==generation)return;ready=true;const f=e.target.getIframe();f.title='Resonance Radio — '+LISTS[current].title;f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.referrerPolicy='strict-origin-when-cross-origin';e.target.playVideo();$('radio-note').textContent=`${items().length} videos in order. When one ends, the next starts; videos that cannot play here are skipped.`;},
          onStateChange:e=>{if(my!==generation)return;state=e.data;if(e.data===0)go(index+1);},
          onError:e=>{if(my!==generation)return;failed.add(current+':'+index);renderNow();
            $('radio-note').textContent=`“${items()[index].label}” cannot play here (${({100:'removed',101:'embedding blocked',150:'embedding blocked or age-restricted',153:'site identity rejected',5:'browser cannot play it'})[e.data]||'error '+e.data}). Skipping to the next video…`;
            skipTimer=setTimeout(()=>{if(my===generation)go(index+1);},2500);}
        }});
    }).catch(()=>{if(my===generation)$('radio-note').textContent='YouTube could not be reached. Check the connection and choose a list again.';});
  }
  $('radio-open').addEventListener('click',()=>{$('radio').hidden=false;$('radio-open').hidden=true;start(current,index);});
  $('radio-close').addEventListener('click',()=>{stop();$('radio').hidden=true;$('radio-open').hidden=false;});
  $('radio-lists').addEventListener('click',e=>{const b=e.target.closest('[data-radio]');if(b)start(b.dataset.radio);});
  $('radio-prev').addEventListener('click',()=>{if(player&&ready)go(Math.max(0,index-1));else start(current,Math.max(0,index-1));});
  $('radio-next').addEventListener('click',()=>{if(player&&ready)go(index+1);else start(current,index+1);});
  $('radio-queue-toggle').addEventListener('click',()=>{const q=$('radio-queue'),open=q.hidden;q.hidden=!open;$('radio-queue-toggle').setAttribute('aria-expanded',String(open));if(open)renderNow();});
  $('radio-queue').addEventListener('click',e=>{const b=e.target.closest('[data-at]');if(!b)return;const i=+b.dataset.at;if(player&&ready)go(i);else start(current,i);});
  document.addEventListener('resonance:play',e=>{if(e.detail!=='radio'&&!$('radio').hidden&&player){stop();$('radio-note').textContent='Paused while the listening room plays. Press a list or ⏭ to resume.';}});
  document.addEventListener('resonance:radio',e=>{const d=e.detail||{};$('radio').hidden=false;$('radio-open').hidden=true;start(d.key||'route',d.from||0);});
  const safe=f=>{try{return f()}catch{return null}};
  window.ResonanceRadio={status:()=>({list:current,index,count:items().length,state,ready,video:safe(()=>player.getVideoData().video_id),expected:items()[index]?.id,time:safe(()=>player.getCurrentTime()),failed:[...failed]}),seekEnd:()=>{if(player&&ready)player.seekTo(Math.max(0,player.getDuration()-2),true);}};
  renderLists();
})();
"""
html = rep(html, "\n</script>\n</body></html>", "\n" + RADIO_JS.replace('__RADIO_JSON__', dump(radio)).replace('__WEB_HOST__', WEB_HOST).replace('__WEB__', WEB) + "</script>\n</body></html>")
