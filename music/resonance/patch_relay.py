# ---------- 6c. Relay player for copies that cannot embed YouTube themselves ----------
# A file opened from disk and the claude.ai frame give YouTube no usable site identity, so their
# players embed WEB/player.html (served next to index.html on the host). It holds the YouTube
# player, plays one video or a queue, and reports events to the page by postMessage. If the relay
# cannot load, playback falls back to opening YouTube, as before.
# Executed by build_resonance.py after patch_playback.py, with html, rep, P, WEB in scope.

PLAYER_HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Resonance player</title>
<style>html,body{margin:0;height:100%;background:#111;overflow:hidden}#p,iframe{width:100%;height:100%;border:0;display:block}</style>
</head><body><div id="p"></div>
<script>
/* Resonance relay player: player.html?id=&ids=a,b,c&i=0[&start=&end=] */
(()=>{'use strict';
const q=new URLSearchParams(location.search),id=q.get('id')||'',ids=(q.get('ids')||'').split(',').filter(x=>/^[\w-]{11}$/.test(x));
const start=+q.get('start')||0,end=+q.get('end')||0;
let i=Math.max(0,Math.min(+q.get('i')||0,ids.length-1)),player=null,skip=0;
const post=m=>{try{parent.postMessage(Object.assign({resonance:1,id},m),'*');}catch{}};
const vars=()=>{const v={autoplay:1,playsinline:1,rel:0};if(location.origin&&location.origin!=='null')v.origin=location.origin;if(ids.length===1){if(start)v.start=start;if(end)v.end=end;}return v;};
function go(n){if(!player)return;if(n<0||n>=ids.length){post({type:'state',state:0,i,last:true});return;}clearTimeout(skip);i=n;post({type:'index',i});player.loadVideoById(ids[i]);}
post({type:'hello',count:ids.length});
if(String(self.origin)==='null'){post({type:'blocked',reason:'no-origin'});return;}
if(!ids.length)return;
window.onYouTubeIframeAPIReady=()=>{
  player=new YT.Player('p',{host:'https://www.youtube-nocookie.com',videoId:ids[i],playerVars:vars(),events:{
    onReady:e=>{e.target.playVideo();post({type:'ready',i,video:ids[i]});},
    onStateChange:e=>{post({type:'state',state:e.data,i,video:ids[i],time:player.getCurrentTime()});if(e.data===0&&ids.length>1&&i<ids.length-1)go(i+1);},
    onError:e=>{post({type:'error',code:e.data,i,video:ids[i]});if(ids.length>1&&i<ids.length-1)skip=setTimeout(()=>go(i+1),2500);}}});
  setInterval(()=>{try{post({type:'tick',state:player.getPlayerState(),i,video:(player.getVideoData()||{}).video_id||ids[i],time:player.getCurrentTime()});}catch{}},1500);
};
addEventListener('message',e=>{if(e.source!==parent||!player)return;const d=e.data||{};
  if(d.resonanceCmd==='go')go(+d.i);
  if(d.resonanceCmd==='seekEnd')player.seekTo(Math.max(0,player.getDuration()-2),true);});
const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>post({type:'error',code:'api',i});document.head.append(s);
})();
</script></body></html>
"""
os.makedirs(P('dist', 'local'), exist_ok=True)
open(P('dist', 'local', 'player.html'), 'w', encoding='utf-8').write(PLAYER_HTML)

RELAY_JS = r"""
/* Relay player: a file on disk or the claude.ai frame cannot embed YouTube itself, so they embed
   __WEB__/player.html, which hosts the YouTube player and reports its events by postMessage. */
window.ResonanceRelay=(()=>{
  'use strict';
  const WEB='__WEB__';let seq=0,blocked=false;const live=new Map();
  addEventListener('message',e=>{const d=e.data;if(!d||d.resonance!==1)return;const h=live.get(d.id);if(h&&e.source===h.win())h.on(d);});
  document.addEventListener('securitypolicyviolation',e=>{if(String(e.blockedURI||'').startsWith(WEB)){blocked=true;for(const h of [...live.values()])h.on({type:'blocked'});}});
  function create(container,{ids,index=0,start=0,end=0,title},on){
    const id='r'+(++seq),f=document.createElement('iframe'),q=new URLSearchParams({id,ids:ids.join(','),i:String(index)});
    if(start)q.set('start',String(start));if(end&&isFinite(end))q.set('end',String(end));
    f.src=`${WEB}/player.html?${q}`;f.title=title||'Resonance player';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;
    let alive=false,done=false,ready=false,slow=0;
    const h={win:()=>f.contentWindow,on:d=>{if(done)return;if(d.type==='hello'&&!alive){alive=true;clearTimeout(timer);slow=setTimeout(()=>{if(!ready&&!done)on({type:'slow'});},15000);}if(d.type==='ready'){alive=ready=true;clearTimeout(timer);clearTimeout(slow);}if(d.type==='blocked'){done=true;blocked=true;clearTimeout(slow);}on(d);}};
    const timer=setTimeout(()=>{if(!alive&&!done){blocked=true;h.on({type:'blocked'});}},10000);
    live.set(id,h);container.append(f);
    const cmd=(c,extra={})=>{try{f.contentWindow?.postMessage(Object.assign({resonanceCmd:c},extra),'*');}catch{}};
    return {go:i=>cmd('go',{i}),cmd,frame:f,destroy:()=>{done=true;clearTimeout(timer);clearTimeout(slow);live.delete(id);f.remove();}};
  }
  return {create,get blocked(){return blocked}};
})();
""".replace('__WEB__', WEB)

html = rep(html, "\n/* Resonance Radio: one embedded YouTube player", RELAY_JS + "\n/* Resonance Radio: one embedded YouTube player")

# ---- Listening room ----
html = rep(html, "let toastTimer, apiSlowTimer, resetArmed=false, autoNext=false, lastFull=false;",
           "let toastTimer, apiSlowTimer, resetArmed=false, autoNext=false, lastFull=false, relay=null;")
html = rep(html, "    try {player?.destroy();} catch {}\n    player=null; $('embed-container').replaceChildren();",
           "    try {player?.destroy();} catch {}\n    try {relay?.destroy();} catch {}\n    player=null; relay=null; $('embed-container').replaceChildren();")
html = rep(html, "    if(LOCAL||!t.videoId) {openExternal(youtubeURL(t));toast('Opening the selected music on YouTube.');return;}",
           "    if(!t.videoId||(LOCAL&&window.ResonanceRelay.blocked)) {openExternal(youtubeURL(t));toast('Opening the selected music on YouTube.');return;}\n    if(LOCAL){relayPlay(t,full);return;}")
html = rep(html, "  function play(full=false) {\n    const t=tracks[current-1];", r"""  function relayPlay(t,full){
    cleanPlayer(); const generation=playerGeneration; lastFull=full; document.dispatchEvent(new CustomEvent('resonance:play',{detail:'history'}));
    const start=t.videoStart||0,end=full?(t.videoEnd||0):Math.min(start+90,t.videoEnd||Infinity),clicked=Date.now();
    const next=delay=>{if(autoNext&&current<tracks.length)setTimeout(()=>{if(generation!==playerGeneration)return;select(current+1);play(lastFull);},delay);};
    $('embed-container').hidden=false;$('play-overlay').hidden=true;
    $('player-status').textContent=full?'Loading the full recording…':'Loading a 90-second introduction. Use “Full recording” to continue.';
    relay=window.ResonanceRelay.create($('embed-container'),{ids:[t.videoId],start,end,title:`${t.artist} — ${t.shortTitle}`},d=>{
      if(generation!==playerGeneration)return;
      if(d.type==='blocked'){cleanPlayer();if(Date.now()-clicked<4000){openExternal(youtubeURL(t));$('player-status').textContent='This copy cannot load the built-in player here, so the recording opened on YouTube.';}else $('player-status').textContent='The built-in player did not load. Use “Open on YouTube” below.';return;}
      if(d.type==='slow')$('player-status').textContent='Still loading. If nothing plays, use “Open on YouTube” below.';
      if(d.type==='state'&&d.state===1)$('player-status').textContent=full?'Playing the full recording.':'Playing a 90-second introduction. Choose “Full recording” for more.';
      if(d.type==='state'&&d.state===0){$('player-status').textContent=autoNext&&current<tracks.length?'Continuous play: moving to the next stop…':(full?'Recording finished. Continue exploring whenever you’re ready.':'Sample finished. Choose “Full recording” to hear more.');next(900);}
      if(d.type==='error'){$('player-status').textContent=(({100:'This upload is no longer available.',101:'The uploader does not allow embedded playback.',150:'The uploader does not allow embedded playback.'})[d.code]||'YouTube could not play this video.')+' Use “Open on YouTube” below.';next(2500);}
    });
  }
  function play(full=false) {
    const t=tracks[current-1];""")

# ---- Future Lab ----
html = rep(html, "  function cleanup(){generation++;clearTimeout(slowTimer);try{player?.destroy();}catch{}player=null;",
           "  let relayF=null;\n  function cleanup(){generation++;clearTimeout(slowTimer);try{player?.destroy();}catch{}player=null;try{relayF?.destroy();}catch{}relayF=null;")
html = rep(html, "    if(LOCAL){openExternal(workURL(w));toast('Opening your selected reference on YouTube.');return;}",
           "    if(LOCAL&&window.ResonanceRelay.blocked){openExternal(workURL(w));toast('Opening your selected reference on YouTube.');return;}\n    if(LOCAL){relayPlay(w,full);return;}")
html = rep(html, "  function play(full=false){\n    const w=works.get(currentWork);if(!w)return;", r"""  function relayPlay(w,full){
    cleanup();document.dispatchEvent(new CustomEvent('resonance:play',{detail:'future'}));
    const myGeneration=generation,start=w.start||0,end=full?0:Math.min(start+90,w.duration||Infinity),clicked=Date.now();
    $('future-embed').hidden=false;$('future-play-overlay').hidden=true;
    $('future-player-status').textContent=full?'Loading the full recording…':`Loading a ${end-start}-second introduction…`;
    relayF=window.ResonanceRelay.create($('future-embed'),{ids:[w.videoId],start,end,title:`${w.artist} — ${w.title}`},d=>{
      if(generation!==myGeneration)return;
      if(d.type==='blocked'){cleanup();if(Date.now()-clicked<4000){openExternal(workURL(w));$('future-player-status').textContent='This copy cannot load the built-in player here, so it opened on YouTube.';}else $('future-player-status').textContent='The built-in player did not load. Use the direct link below.';return;}
      if(d.type==='slow')$('future-player-status').textContent='Still loading. If nothing plays, use the direct link below.';
      if(d.type==='state'&&d.state===1)$('future-player-status').textContent=full?'Playing the full recording.':`Playing a ${end-start}-second introduction.`;
      if(d.type==='state'&&d.state===0)$('future-player-status').textContent=full?'Recording finished. Keep exploring at your own pace.':'Sample finished. Choose “Full recording” to hear more.';
      if(d.type==='error')$('future-player-status').textContent=(({100:'This upload is unavailable.',101:'The uploader blocks embedded playback.',150:'The uploader blocks embedded playback.'})[d.code]||'YouTube could not play this video.')+' Open it on YouTube or try an alternative upload.';
    });
  }
  function play(full=false){
    const w=works.get(currentWork);if(!w)return;""")

# ---- Resonance Radio ----
html = rep(html, "let current='route',index=0,player=null,ready=false,generation=0,state=-1,failed=new Set(),skipTimer=0,apiPromise=null;",
           "let current='route',index=0,player=null,ready=false,generation=0,state=-1,failed=new Set(),skipTimer=0,apiPromise=null,relay=null,relayVideo=null,relayTime=null;")
html = rep(html, "try{player?.destroy();}catch{}player=null;ready=false;state=-1;$('radio-frame').replaceChildren();}",
           "try{player?.destroy();}catch{}try{relay?.destroy();}catch{}player=null;relay=null;relayVideo=null;relayTime=null;ready=false;state=-1;$('radio-frame').replaceChildren();}")
html = rep(html, "if(player&&ready){player.loadVideoById(list[i].id);}", "if(relay){relayVideo=null;relayTime=null;state=-1;relay.go(i);}else if(player&&ready){player.loadVideoById(list[i].id);}")
html = rep(html, "    if(LOCAL){openExternal('https://www.youtube.com/watch_videos?video_ids='",
           "    if(LOCAL&&window.ResonanceRelay.blocked){openExternal('https://www.youtube.com/watch_videos?video_ids='")
html = rep(html, "    stop();const my=generation;renderNow();\n", r"""    stop();const my=generation;renderNow();
    if(LOCAL){const clicked=Date.now();$('radio-note').textContent='Loading the player…';
      relay=window.ResonanceRelay.create($('radio-frame'),{ids:items().map(x=>x.id),index,title:'Resonance Radio — '+LISTS[current].title},d=>{
        if(my!==generation)return;
        if(d.type==='blocked'){stop();if(Date.now()-clicked<4000)openExternal('https://www.youtube.com/watch_videos?video_ids='+items().slice(index,index+50).map(x=>x.id).join(','));$('radio-note').textContent='This copy cannot load the built-in player here, so the list opened on YouTube.';return;}
        if(d.type==='ready'){ready=true;$('radio-note').textContent=`${items().length} videos in order. When one ends, the next starts; videos that cannot play here are skipped.`;}
        if(d.type==='slow')$('radio-note').textContent='Still loading. If nothing plays, choose the list again or open it on YouTube.';
        if(d.type==='index'){index=d.i;renderNow();}
        if(typeof d.state==='number')state=d.state;if(d.video)relayVideo=d.video;if(typeof d.time==='number')relayTime=d.time;
        if(d.type==='error'){failed.add(current+':'+d.i);renderNow();$('radio-note').textContent=`“${items()[d.i]?.label||'This video'}” cannot play here. Skipping to the next video…`;}
      });
      return;}
""")
html = rep(html, "if(player&&ready)go(", "if((player||relay)&&ready)go(", 3)
html = rep(html, "if(e.detail!=='radio'&&!$('radio').hidden&&player){stop();", "if(e.detail!=='radio'&&!$('radio').hidden&&(player||relay)){stop();")
html = rep(html, "video:safe(()=>player.getVideoData().video_id),", "video:relay?relayVideo:safe(()=>player.getVideoData().video_id),")
html = rep(html, "time:safe(()=>player.getCurrentTime()),", "time:relay?relayTime:safe(()=>player.getCurrentTime()),relay:!!relay,")
html = rep(html, "seekEnd:()=>{if(player&&ready)", "seekEnd:()=>{if(relay){relay.cmd('seekEnd');return;}if(player&&ready)")

# The relay plays in the page, so the Future Lab's full-recording button no longer opens a new tab.
html = rep(html, "${LOCAL?'↗':''}</button></div><p class=\"player-status\" id=\"future-player-status\"", "</button></div><p class=\"player-status\" id=\"future-player-status\"")
