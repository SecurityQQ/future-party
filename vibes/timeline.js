/* The wall timeline: every wall on the site can be moved through in time, like a film.
   One row above the wall's buttons: the time so far, the whole loop as a rail (each chapter or block a segment in
   its own colour) and the loop's length. Drag or click the rail; scroll with the mouse wheel or the trackpad anywhere
   on the wall (one notch is about one slide); Shift+← → moves ten seconds; on the rail itself ← → move five seconds,
   Page Up/Down a minute, Home/End the ends. The slide under the time shows at once, at the point it would have reached.
   Nothing on the slides moves because of the timeline: it only changes which slide is up and how far it has run.

   Each wall's build inlines this file where its template says WALL_TIMELINE (in a comment), so every page keeps
   working from a folder with no server. A wall hands over:
     bar      the element the row goes into (the wall's button bar; the row takes a line of its own at the top)
     host     the element that listens to the wheel (the fullscreen player)
     active() true while the wall is playing, so the wheel scrolls the page as usual otherwise
     items()  every slide's length in ms, in play order
     marks()  where chapters begin: [{i, label, color}], optional
     label(i) a few words for slide i, shown with the time while pointing or scrolling, optional
     pos()    {i, t}: the slide on screen and the ms it has run
     seek(i, t, live) show slide i, t ms in; live is true while the person is still dragging or scrolling
     poke()   wake the wall's controls
     wheelMs  ms one wheel notch moves (default: the average slide)
     accent   the colour of the rail without chapters */
(function(){
if(window.WallTimeline)return;
var CSS='.wtl{box-sizing:border-box;flex:1 0 100%;width:100%;padding:0 max(0px,calc((100% - 1180px)/2));margin:0 0 6px;display:flex;align-items:center;gap:14px;font:400 11px/1 var(--wtl-mono,"Martian Mono",ui-monospace,"SF Mono",Menlo,monospace);color:var(--wtl-muted,#a2b6d4);font-variant-numeric:tabular-nums;-webkit-user-select:none;user-select:none}'+
'.wtl[hidden]{display:none!important}'+
'.wtl-t{flex:none;min-width:4.6em;letter-spacing:.02em}.wtl-now{text-align:right;color:var(--wtl-fg,#edf4ff)}'+
'.wtl-track{position:relative;flex:1;min-width:0;height:22px;cursor:pointer;touch-action:none;outline:none;border-radius:6px}'+
'.wtl-track:focus-visible{box-shadow:0 0 0 2px var(--wtl-accent,#4385ff)}'+
'.wtl-rail{position:absolute;left:0;right:0;top:50%;height:4px;margin-top:-2px;transition:height .15s,margin .15s}'+
'.wtl-track:hover .wtl-rail,.wtl.on .wtl-rail{height:8px;margin-top:-4px}'+
'.wtl-seg{position:absolute;top:0;bottom:0;border-radius:2px;overflow:hidden;background:rgb(237 244 255/.1)}'+
'.wtl-seg::before{content:"";position:absolute;inset:0;background:var(--c);opacity:.3}'+
'.wtl-seg b{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--c)}'+
'.wtl-head{position:absolute;top:50%;left:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--wtl-fg,#edf4ff);box-shadow:0 0 0 3px rgb(3 8 23/.55);transition:transform .15s;pointer-events:none}'+
'.wtl-track:hover .wtl-head,.wtl.on .wtl-head{transform:scale(1.25)}'+
'.wtl-tip{position:absolute;bottom:calc(100% + 10px);left:0;transform:translateX(-50%);white-space:nowrap;max-width:min(60vw,440px);overflow:hidden;text-overflow:ellipsis;padding:7px 10px;border-radius:8px;background:rgb(3 8 23/.92);border:1px solid var(--wtl-line,#2d486d);color:var(--wtl-muted,#a2b6d4);pointer-events:none}'+
'.wtl-tip b{font-weight:500;color:var(--wtl-fg,#edf4ff);margin-right:.7em}'+
'@media (max-width:560px){.wtl{gap:8px}.wtl-t{min-width:3.6em;font-size:10px}}';
function css(){
  if(document.getElementById('wtl-css'))return;
  var s=document.createElement('style');s.id='wtl-css';s.textContent=CSS;(document.head||document.documentElement).appendChild(s);
}
function clock(ms){
  var s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;
  return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(r).padStart(2,'0');
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function WallTimeline(o){
  css();
  var el=document.createElement('div');el.className='wtl';el.hidden=true;
  if(o.accent)el.style.setProperty('--wtl-accent',o.accent);
  el.innerHTML='<span class="wtl-t wtl-now">0:00</span><div class="wtl-track" role="slider" tabindex="0" aria-label="Time on the wall" aria-valuemin="0"><div class="wtl-rail"></div><i class="wtl-head"></i><div class="wtl-tip" hidden></div></div><span class="wtl-t wtl-len">0:00</span>';
  o.bar.insertBefore(el,o.bar.firstChild);
  var track=el.querySelector('.wtl-track'),rail=el.querySelector('.wtl-rail'),head=el.querySelector('.wtl-head'),tip=el.querySelector('.wtl-tip');
  var nowEl=el.querySelector('.wtl-now'),lenEl=el.querySelector('.wtl-len');
  var durs=[],starts=[],total=0,segs=[],shownSec=-1;
  var scrub=null,drag=false,hover=false,wheelEnd=0,frame=0,want=null,wantLive=false;
  var active=o.active||function(){return true};
  var poke=o.poke||function(){};

  function refresh(){
    durs=(o.items()||[]).map(function(d){return Math.max(1,+d||0)});
    starts=[];total=0;durs.forEach(function(d){starts.push(total);total+=d});
    var marks=(o.marks?o.marks():[])||[];
    marks=marks.filter(function(m){return m&&m.i>=0&&m.i<durs.length}).sort(function(a,b){return a.i-b.i});
    if(!marks.length||marks[0].i>0)marks.unshift({i:0,label:'',color:o.accent||'#4385ff'});
    segs=marks.map(function(m,k){var a=starts[m.i],b=k+1<marks.length?starts[marks[k+1].i]:total;return {a:a,b:b,label:m.label||'',color:m.color||o.accent||'#4385ff'}}).filter(function(s){return s.b>s.a});
    rail.innerHTML=segs.map(function(s,k){
      var l=s.a/total*100,w=(s.b-s.a)/total*100,gap=k+1<segs.length?' - 2px':'';
      return '<i class="wtl-seg" style="--c:'+esc(s.color)+';left:'+l.toFixed(4)+'%;width:calc('+w.toFixed(4)+'%'+gap+')"><b></b></i>';
    }).join('');
    segs.forEach(function(s,k){s.fill=rail.children[k].firstChild});
    lenEl.textContent=clock(total);track.setAttribute('aria-valuemax',String(Math.round(total/1000)));
    el.hidden=!(total>0&&durs.length);
    shownSec=-1;draw(total?now():0);
  }
  function at(t){ // the slide that is on at t ms into the loop
    var lo=0,hi=starts.length-1;
    while(lo<hi){var mid=(lo+hi+1)>>1;if(starts[mid]<=t)lo=mid;else hi=mid-1}
    return lo;
  }
  function segOf(t){for(var k=segs.length-1;k>=0;k--)if(t>=segs[k].a)return segs[k];return segs[0]}
  function now(){
    if(!durs.length)return 0;
    var p=o.pos()||{i:0,t:0},i=Math.min(Math.max(0,p.i|0),durs.length-1);
    return starts[i]+Math.min(Math.max(0,p.t||0),durs[i]);
  }
  function draw(t){
    if(!total)return;
    var f=Math.min(1,Math.max(0,t/total));
    head.style.left=(f*100)+'%';
    segs.forEach(function(s){s.fill.style.width=(t<=s.a?0:t>=s.b?100:(t-s.a)/(s.b-s.a)*100)+'%'});
    var sec=Math.floor(t/1000);
    if(sec!==shownSec){
      shownSec=sec;nowEl.textContent=clock(t);
      var sg=segOf(t);
      track.setAttribute('aria-valuenow',String(sec));
      track.setAttribute('aria-valuetext',clock(t)+' of '+clock(total)+(sg&&sg.label?', '+sg.label:''));
    }
  }
  function describe(t){
    var i=at(t),sg=segOf(t),bits=[];
    if(sg&&sg.label)bits.push(sg.label);
    var l=o.label?o.label(i):'';if(l&&l!==(sg&&sg.label))bits.push(l);
    return '<b>'+clock(t)+'</b>'+esc(bits.join(' · '));
  }
  function showTip(t){
    tip.innerHTML=describe(t);tip.hidden=false;
    var w=track.clientWidth||1,x=Math.min(1,Math.max(0,t/total))*w,half=(tip.offsetWidth||0)/2;
    tip.style.left=Math.min(Math.max(x,half),Math.max(half,w-half))+'px';
  }
  function hideTip(){if(!drag&&!hover&&!wheelEnd)tip.hidden=true}
  // Moves are applied once a frame, so a fast drag or a trackpad flick builds one slide per frame at most
  function go(t,live){
    t=Math.min(Math.max(0,t),Math.max(0,total-1));
    scrub=live?t:null;want=t;wantLive=live;
    if(!frame)frame=requestAnimationFrame(apply);
    draw(t);
  }
  function apply(){
    frame=0;if(want==null)return;
    var t=want,live=wantLive,i=at(t);want=null;
    o.seek(i,t-starts[i],live);
  }
  function fromX(e){var r=track.getBoundingClientRect();return Math.min(1,Math.max(0,(e.clientX-r.left)/(r.width||1)))*total}

  track.addEventListener('pointerdown',function(e){
    if(!total||e.button>0)return;
    e.preventDefault();drag=true;el.classList.add('on');
    try{track.setPointerCapture(e.pointerId)}catch(x){}
    var t=fromX(e);go(t,true);showTip(t);poke();
  });
  track.addEventListener('pointermove',function(e){
    if(!total)return;
    var t=fromX(e);
    if(drag){go(t,true);showTip(t);poke()}
    else if(e.pointerType==='mouse'){hover=true;showTip(t)}
  });
  function up(e){
    if(!drag)return;
    drag=false;el.classList.remove('on');
    go(fromX(e),false);hideTip();
  }
  track.addEventListener('pointerup',up);
  track.addEventListener('pointercancel',function(){drag=false;el.classList.remove('on');if(scrub!=null)go(scrub,false);hideTip()});
  track.addEventListener('pointerleave',function(){hover=false;hideTip()});
  track.addEventListener('click',function(e){e.stopPropagation()});
  track.addEventListener('keydown',function(e){
    if(!total)return;
    var k=e.key,t=scrub!=null?scrub:now(),step={ArrowRight:5e3,ArrowUp:5e3,ArrowLeft:-5e3,ArrowDown:-5e3,PageUp:-6e4,PageDown:6e4}[k];
    if(step!=null)t+=step*(e.shiftKey?2:1);else if(k==='Home')t=0;else if(k==='End')t=total-1;else return;
    e.preventDefault();e.stopPropagation();go(t,false);poke();
  });

  function wheel(e){
    if(!total||!active()||e.ctrlKey)return;
    var d=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(!d)return;
    e.preventDefault();
    if(e.deltaMode===1)d*=33;else if(e.deltaMode===2)d*=800;
    var per=(o.wheelMs||total/durs.length)/100;
    var t=(scrub!=null?scrub:now())+d*per;
    el.classList.add('on');go(t,true);
    clearTimeout(wheelEnd);
    wheelEnd=setTimeout(function(){wheelEnd=0;el.classList.remove('on');if(scrub!=null)go(scrub,false);hideTip()},450);
    showTip(Math.min(Math.max(0,t),total-1));poke();
  }
  (o.host||o.bar).addEventListener('wheel',wheel,{passive:false});
  // Shift+← → anywhere on the wall: ten seconds back or on (the wall's own ← → still move a slide)
  window.addEventListener('keydown',function(e){
    if(!total||!active()||!e.shiftKey||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    if(e.target===track)return;
    e.preventDefault();e.stopImmediatePropagation();
    go((scrub!=null?scrub:now())+(e.key==='ArrowRight'?1e4:-1e4),false);poke();
  },true);

  return {
    el:el,
    refresh:refresh,
    update:function(){if(total&&scrub==null&&want==null)draw(now())},
    get busy(){return scrub!=null||want!=null}
  };
}
/* Puts the CSS animations of el and everything in it at ms since they started, so a slide opened in the middle shows
   the state it would have reached by then (a picture partway through its slow push, the lines already in). */
WallTimeline.at=function(el,ms){
  if(!el||!el.getAnimations)return;
  try{el.getAnimations({subtree:true}).forEach(function(a){try{a.currentTime=Math.max(0,ms)}catch(x){}})}catch(x){}
};
WallTimeline.clock=clock;
window.WallTimeline=WallTimeline;
})();
