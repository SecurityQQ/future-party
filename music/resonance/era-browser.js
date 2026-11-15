/* History of Music 2050 · eras and recordings.
 *
 * Two pieces, written for this framework-free page after two React components:
 * - Eras are glass folders (after Glass Folder Cards): generated liquid art on the
 *   back panel, a frosted front that leans open on its bottom hinge, and sheets
 *   peeking out of the pocket that rise when the era is open.
 * - The recordings of the open era sit on a molten ring (after Molten Ring
 *   Carousel): each card is a rounded-box distance field and one WebGL2 pass takes
 *   a smooth minimum over all of them, so cards pour out of the era as one drop,
 *   part with strands, and melt into each other towards the edges.
 * Without WebGL2 the ring is a row of plain buttons. Everything the canvas shows is
 * also in its fallback content, as listbox options for assistive technology.
 */
(() => {
  'use strict';
  if (window.ResonanceEras) return;

  /* One palette per era, all leaning on the page's blue; the accent changes. */
  const PALETTES = [
    {style: 'marble', colors: ['#050a1a', '#13295a', '#2f56a3', '#0c1430', '#9c7a45', '#e6c78f', '#f6ead0'], scale: .7, warp: 3.2, angle: -.4, gloss: .45, veins: .45},
    {style: 'marble', colors: ['#07081a', '#241a52', '#5b48a8', '#120e2a', '#3d6fd0', '#b7c9ff', '#f3e6c4'], scale: .72, warp: 3.4, angle: .8, gloss: .5, veins: .5},
    {style: 'streak', colors: ['#eef4fd', '#c5d3e8', '#6d88b3', '#16284a', '#3b5f97', '#a9c4e8', '#eef4ff'], scale: .7, warp: 1.5, angle: -.6, gloss: .2, veins: 0},
    {style: 'marble', colors: ['#04101a', '#0f3640', '#2f7f8a', '#0a1a24', '#b58a3c', '#ead08a', '#fbf3d6'], scale: .7, warp: 3.4, angle: 2.1, gloss: .5, veins: .5},
    {style: 'marble', colors: ['#0c0618', '#3a1659', '#8a3fa0', '#1b0d2b', '#d0508f', '#f2a6c8', '#fde7f1'], scale: .75, warp: 3.6, angle: .6, gloss: .5, veins: .4},
    {style: 'streak', colors: ['#f1ecf4', '#e9c2d8', '#c2437f', '#1e1a3a', '#22395e', '#4385ff', '#e5edf4'], scale: .7, warp: 1.4, angle: -.62, gloss: .18, veins: 0},
    {style: 'streak', colors: ['#f7f8fa', '#d9e2ea', '#9fb4c7', '#e8edf2', '#7d9cc0', '#ffffff'], scale: .7, warp: 1.6, angle: .35, gloss: .25, veins: 0},
    {style: 'marble', colors: ['#030817', '#0b1b36', '#2c5fd6', '#4385ff', '#9dd8ff', '#e1f2ff', '#7a5cff'], scale: .62, warp: 3.2, angle: -.5, gloss: .55, veins: .6},
  ].map((p, i) => ({...p, key: 'era' + i}));
  const palette = era => PALETTES[era % PALETTES.length];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const inOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const outCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const inCubic = t => t * t * t;

  // ---------------------------------------------------------------------------
  // Generated art: a domain-warped noise field shaded as a liquid surface,
  // painted a few rows per frame by one shared queue so nothing janks.

  function hexToRgb(hex) {
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeFbm(seed) {
    const r = rng(seed), perm = new Uint8Array(512), grad = new Float32Array(512), p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; grad[i * 2] = Math.cos(a); grad[i * 2 + 1] = Math.sin(a); }
    const noise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const h00 = perm[X + perm[Y]] * 2, h10 = perm[X + 1 + perm[Y]] * 2, h01 = perm[X + perm[Y + 1]] * 2, h11 = perm[X + 1 + perm[Y + 1]] * 2;
      const d00 = grad[h00] * xf + grad[h00 + 1] * yf, d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
      const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1), d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
    };
    return (x, y, octaves) => {
      let sum = 0, amp = .5;
      for (let i = 0; i < octaves; i++) {
        sum += amp * noise(x, y);
        const nx = 1.6 * x + 1.2 * y + 7.1;
        y = -1.2 * x + 1.6 * y + 3.3; x = nx; amp *= .5;
      }
      return sum;
    };
  }
  function createArtJob(width, height, recipe, seed) {
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    const stops = recipe.colors.map((c, i) => ({t: i / (recipe.colors.length - 1), c: hexToRgb(c)}));
    const scale = recipe.scale ?? .7, warp = recipe.warp ?? 3, gloss = recipe.gloss ?? .4, veins = recipe.veins ?? 0;
    const streak = recipe.style === 'streak', fbm = makeFbm(seed * 977 + 13), r = rng(seed + 1);
    const ox = r() * 50, oy = r() * 50, angle = (recipe.angle ?? 0) + (r() - .5) * .5, ca = Math.cos(angle), sa = Math.sin(angle);
    const m = Math.min(w, h), gw = Math.ceil(w / 2) + 3, gh = Math.ceil(h / 2) + 3;
    const G = new Float32Array(gw * gh), GQ = new Float32Array(gw * gh), F = new Float32Array(w * h), Q = new Float32Array(w * h);
    const pixels = new Uint8ClampedArray(w * h * 4);
    let row = 0;
    const field = gy => {
      for (let gx = 0; gx < gw; gx++) {
        const u = ((gx - 1) * 2 - w / 2) / m, v = ((gy - 1) * 2 - h / 2) / m;
        let px = (u * ca - v * sa) * scale, py = (u * sa + v * ca) * scale;
        if (streak) { px *= .14; py *= 2.2; }
        px += ox; py += oy;
        const qx = fbm(px, py, 3), qy = fbm(px + 5.2, py + 1.3, 3);
        const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3), ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
        G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
        GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
      }
    };
    const upsample = () => {
      const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16, T = new Float32Array(w * gh);
      for (let gy = 0; gy < gh; gy++) {
        const rr = gy * gw;
        for (let x = 0; x < w; x++) { const c = (x >> 1) + 1; T[gy * w + x] = x & 1 ? cr(G[rr + c - 1], G[rr + c], G[rr + c + 1], G[rr + c + 2]) : G[rr + c]; }
      }
      for (let y = 0; y < h; y++) {
        const c = (y >> 1) + 1;
        for (let x = 0; x < w; x++) {
          F[y * w + x] = y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x];
          const gx = (x >> 1) + 1, q0 = GQ[c * gw + gx], qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
          const q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx;
          Q[y * w + x] = (qx + q1) / 2;
        }
      }
    };
    const colorize = () => {
      const sample = [], stride = Math.max(1, Math.floor(F.length / 4096));
      for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
      sample.sort((a, b) => a - b);
      const lo = sample[Math.floor(sample.length * .02)], hi = sample[Math.floor(sample.length * .98)], k = 1 / (hi - lo || 1);
      const lx = -.55, ly = -.65, lz = .52, slope = k * m * .012;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let t = clamp((F[i] - lo) * k, 0, 1), j = 1;
        while (j < stops.length - 1 && stops[j].t < t) j++;
        const a = stops[j - 1], b = stops[j];
        let f = clamp((t - a.t) / (b.t - a.t || 1), 0, 1);
        f = f * f * (3 - 2 * f);
        const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope, gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
        const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
        const spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255, silk = 1 + .035 * Math.sin(t * 150 + Q[i] * 24);
        const vein = veins * Math.max(0, 1 - Math.abs(Q[i] - .42) * 14) * .6, lit = (.82 + .28 * nd) * silk * (1 - vein);
        pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
        pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
        pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
        pixels[i * 4 + 3] = 255;
      }
    };
    return {width: w, height: h, pixels, step(rows) {
      if (row >= gh) return true;
      const end = Math.min(gh, row + Math.max(1, rows));
      while (row < end) field(row++);
      if (row < gh) return false;
      upsample(); colorize(); return true;
    }};
  }

  const artCache = new Map(), pending = new Map(), queue = [];
  let pumping = false;
  function pump() {
    if (pumping) return;
    pumping = true;
    const tick = () => {
      const until = performance.now() + 7;
      while (queue.length && performance.now() < until) {
        const head = queue[0];
        if (!head.job.step(4)) continue;
        queue.shift(); pending.delete(head.key);
        const c = document.createElement('canvas');
        c.width = head.job.width; c.height = head.job.height;
        c.getContext('2d')?.putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
        head.done(c);
      }
      if (queue.length) requestAnimationFrame(tick); else pumping = false;
    };
    requestAnimationFrame(tick);
  }
  const enqueue = entry => {
    let at = queue.length;
    while (at > 1 && queue[at - 1].priority > entry.priority) at--;
    queue.splice(at, 0, entry);
  };
  /** Lower priority paints first; asking again with a lower number moves a queued job up. */
  function paint(recipe, seed, w, h, priority) {
    const key = [recipe.key, seed, w, h].join('|');
    const queued = pending.get(key);
    if (queued && queued.priority > priority && queue.indexOf(queued) > 0) {
      queue.splice(queue.indexOf(queued), 1); queued.priority = priority; enqueue(queued);
    }
    let p = artCache.get(key);
    if (!p) {
      p = new Promise(done => {
        const entry = {key, job: createArtJob(w, h, recipe, seed), priority, done};
        pending.set(key, entry); enqueue(entry); pump();
      });
      artCache.set(key, p);
    }
    return p;
  }

  // ---------------------------------------------------------------------------
  // The molten ring.

  const MAX_CARDS = 12, MAX_STRANDS = 12;
  const CELL_W = 512, CELL_H = 288, ART_W = 320, ART_H = 180;

  /* Figures are multiples of the card width unless they say otherwise. */
  const FUSE = .06, CORNER = .05, CROSSFADE = .035;
  const CURSOR_FUSE = .085, CURSOR_REACH = .65, PULL = .065, SWELL = .06, REACH = 1.4, GRAB = .14, RELEASE = .06;
  const NEIGHBOUR_PUSH = .05, NEIGHBOUR_SCALE = .035, NEIGHBOUR_DIM = .15, NEIGHBOUR_REACH = 2.4;
  const WAVE = .01, WAVE_FREQ = 20, WAVE_SPEED = 7;
  const STRAND = .2, STRAND_SNAP = .5, WAIST = .35, SAG = .015, WELD = .035;
  const BAND = .055, REFRACT = .15, SQUEEZE = .05, RIPPLE = .0125, RIPPLE_FREQ = 8, FRINGE = .004, SHEEN = .05; // BAND: of the stage width
  const WOBBLE = .0075;
  const WHEEL = .0032, EASE = .12, SNAP_EASE = .1, SNAP_IDLE = 200, TWEEN_MS = 620, GATHER_MS = 300, POUR_MS = 1050, CLICK_SLOP = 6;

  const QUAD_VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){vUv=aPos;gl_Position=vec4(aPos*2.0-1.0,0.0,1.0);}`;

  const RING_FRAG = `#version 300 es
precision highp float;
#define MAX_CARDS ${MAX_CARDS}
#define MAX_STRANDS ${MAX_STRANDS}
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec2 uSize;
uniform float uCorner;
uniform float uCount;
uniform vec2 uCentre[MAX_CARDS];
uniform float uAngle[MAX_CARDS];
uniform vec4 uCardState[MAX_CARDS]; // xy scale, z brightness, w atlas cell
uniform float uStrandCount;
uniform vec2 uStrandA[MAX_STRANDS];
uniform vec2 uStrandB[MAX_STRANDS];
uniform vec4 uStrandPar[MAX_STRANDS];
uniform float uFuse;
uniform float uJitter;
uniform float uTime;
uniform vec3 uColor;
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform float uCrossfade;
uniform float uHasArt;
uniform vec4 uCursor;
uniform vec4 uWake;
uniform float uLipDepth;
uniform vec4 uLip;
uniform float uFringe;
uniform float uSheen;

vec2 atlasUV(vec2 uv, float idx){return (vec2(mod(idx,uGrid.x),floor(idx/uGrid.x))+uv)/uGrid;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y)*2.0-1.0;}
float sdRoundBox(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r;}
float sdStrand(vec2 p, vec2 a, vec2 b, float rEnd, float rMid, float sag){
  vec2 ba=b-a;float len=length(ba);if(len<0.001)return 1e6;
  vec2 dir=ba/len,nrm=vec2(-dir.y,dir.x),q=p-(a+b)*0.5;
  float along=dot(q,dir),across=dot(q,nrm);
  float h=clamp(along/len+0.5,0.0,1.0),bell=sin(3.14159265*h);
  across+=sag*bell*nrm.y;
  float r=mix(rMid,rEnd,pow(1.0-bell,1.7));
  return max(abs(along)-len*0.5,abs(across)-r);
}
float smin(float a, float b, float k){if(k<=0.0001)return min(a,b);float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
// The left and right margins behave like the ground edge of a thick pane.
float lipWarp(inout vec2 p){
  if(uLipDepth<=0.5)return 0.0;
  float dx=abs(p.x)-(uResolution.x*0.5-uLipDepth);
  if(dx<=0.0)return 0.0;
  float t=clamp(dx/uLipDepth,0.0,1.0),bend=1.0-sqrt(max(0.0,1.0-t*t));
  p.x-=sign(p.x)*bend*(uLip.x+sin(p.y*uLip.w)*uLip.z);
  p.y*=1.0-bend*uLip.y;
  return bend;
}
void main(){
  vec2 p=(vUv-0.5)*uResolution;
  float bend=lipWarp(p);
  float toCursor=length(p-uCursor.xy);
  float k=uFuse;
  if(uCursor.z>0.001){float t=1.0-smoothstep(0.0,max(uWake.x,1.0),toCursor);k+=uCursor.w*uCursor.z*t*t;}
  float d=1e6,d0=1e6,d1=1e6,im0=0.0,im1=0.0,dm0=1.0,dm1=1.0;
  vec2 uv0=vec2(0.5),uv1=vec2(0.5);
  float halfSpan=length(uSize)*0.5;
  for(int i=0;i<MAX_CARDS;i++){
    if(float(i)>=uCount)break;
    vec4 st=uCardState[i];
    float grown=max(st.x,st.y);
    if(grown<=0.0001)continue;
    vec2 q=p-uCentre[i];
    float cull=halfSpan*grown+k+uJitter+8.0;
    if(dot(q,q)>cull*cull)continue;
    float ca=cos(uAngle[i]),sa=sin(uAngle[i]);
    q=vec2(q.x*ca+q.y*sa,-q.x*sa+q.y*ca);
    vec2 halfSize=max(uSize*0.5*st.xy,vec2(0.0001));
    float rMax=min(halfSize.x,halfSize.y);
    // A drop while it is tiny, a card once it has grown.
    float r=min(rMax,mix(rMax,uCorner*grown,smoothstep(0.12,0.45,min(st.x,st.y))));
    float di=sdRoundBox(q,halfSize,r);
    d=smin(d,di,k);
    vec2 luv=clamp(q/(2.0*halfSize)+0.5,0.004,0.996);
    luv.y=1.0-luv.y;
    if(di<d0){d1=d0;uv1=uv0;im1=im0;dm1=dm0;d0=di;uv0=luv;im0=st.w;dm0=st.z;}
    else if(di<d1){d1=di;uv1=luv;im1=st.w;dm1=st.z;}
  }
  for(int i=0;i<MAX_STRANDS;i++){
    if(float(i)>=uStrandCount)break;
    vec4 par=uStrandPar[i];
    if(par.x<=-3.0)continue;
    vec2 a=uStrandA[i],b=uStrandB[i],mid=(a+b)*0.5;
    float span=length(b-a)*0.5+par.x+par.w+8.0;
    if(dot(p-mid,p-mid)>span*span)continue;
    d=smin(d,sdStrand(p,a,b,par.x,par.y,par.z),par.w);
  }
  if(uJitter>0.001)d+=noise(p*0.012+vec2(uTime*0.22,uTime*-0.17))*uJitter;
  if(uWake.y>0.001)d+=sin(toCursor*uWake.z-uTime*uWake.w)*uWake.y*exp(-toCursor/max(uWake.x,1.0));
  float aa=clamp(fwidth(d),0.5,2.0);
  float alpha=1.0-smoothstep(-aa,aa,d);
  if(alpha<=0.001)discard;
  float nearest=smoothstep(-uCrossfade,uCrossfade,d1-d0);
  vec3 col=uColor;
  if(uHasArt>0.5){
    vec2 fr=vec2(uFringe*bend,0.0);
    vec3 c0=vec3(texture(uAtlas,atlasUV(uv0+fr,im0)).r,texture(uAtlas,atlasUV(uv0,im0)).g,texture(uAtlas,atlasUV(uv0-fr,im0)).b);
    vec3 c1=vec3(texture(uAtlas,atlasUV(uv1+fr,im1)).r,texture(uAtlas,atlasUV(uv1,im1)).g,texture(uAtlas,atlasUV(uv1-fr,im1)).b);
    col=mix(c1,c0,nearest);
  }
  col*=mix(dm1,dm0,nearest);
  // A glass rim along the whole molten outline, brightest on top.
  float rim=1.0-smoothstep(0.0,2.4,-d);
  col=mix(col,vec3(0.86,0.93,1.0),rim*mix(0.16,0.42,clamp(0.5+p.y/uResolution.y,0.0,1.0)));
  col+=bend*uSheen;
  fragColor=vec4(col,alpha);
}`;

  function build(gl) {
    const program = gl.createProgram();
    if (!program) return null;
    for (const [type, source] of [[gl.VERTEX_SHADER, QUAD_VERT], [gl.FRAGMENT_SHADER, RING_FRAG]]) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(shader)); return null; }
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(program)); return null; }
    return program;
  }

  const rootStyle = () => getComputedStyle(document.documentElement);
  let fontsReady = null;
  function loadFonts(font, mono) {
    if (!fontsReady) {
      const wait = document.fonts ? Promise.all([`600 34px ${font}`, `400 26px ${font}`, `500 19px ${mono}`].map(f => document.fonts.load(f).catch(() => null))) : Promise.resolve();
      fontsReady = Promise.race([wait, new Promise(r => setTimeout(r, 1500))]);
    }
    return fontsReady;
  }
  function fit(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    let lo = 0, hi = text.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ctx.measureText(text.slice(0, mid).trimEnd() + '…').width <= max) lo = mid; else hi = mid - 1; }
    return text.slice(0, lo).trimEnd() + '…';
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /** One card of the atlas: the art, then the words, sized for a 512 × 288 cell. */
  function drawCard(ctx, x, y, track, art, index, count, fonts) {
    const {font, mono} = fonts, P = 26, W = CELL_W, H = CELL_H;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();
    if (art) ctx.drawImage(art, x, y, W, H); else { ctx.fillStyle = '#0b1b36'; ctx.fillRect(x, y, W, H); }
    const g = ctx.createLinearGradient(0, y, 0, y + H);
    g.addColorStop(0, 'rgba(3,8,23,.55)'); g.addColorStop(.3, 'rgba(3,8,23,.06)'); g.addColorStop(.5, 'rgba(3,8,23,.2)'); g.addColorStop(1, 'rgba(3,8,23,.92)');
    ctx.fillStyle = g; ctx.fillRect(x, y, W, H);
    ctx.textBaseline = 'alphabetic';
    // date chip
    ctx.font = `500 19px ${mono}`;
    const date = String(track.date), dw = ctx.measureText(date).width + 26;
    roundRect(ctx, x + P - 4, y + P - 4, dw, 36, 18);
    ctx.fillStyle = 'rgba(3,8,23,.5)'; ctx.fill();
    ctx.strokeStyle = 'rgba(157,216,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#bfe6ff'; ctx.fillText(date, x + P + 9, y + P + 20);
    // position in the era
    ctx.font = `400 16px ${mono}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(220,233,251,.78)';
    ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`, x + W - P, y + P + 18);
    ctx.textAlign = 'left';
    // genre, artist, title
    const max = W - P * 2;
    ctx.font = `400 15px ${mono}`; ctx.fillStyle = 'rgba(162,182,212,.95)';
    ctx.fillText(fit(ctx, String(track.genre || '').toUpperCase(), max), x + P, y + H - P - 82);
    let size = 34;
    ctx.font = `600 ${size}px ${font}`;
    while (size > 26 && ctx.measureText(track.artist).width > max) { size -= 2; ctx.font = `600 ${size}px ${font}`; }
    ctx.fillStyle = '#f4f8ff'; ctx.fillText(fit(ctx, track.artist, max), x + P, y + H - P - 38);
    ctx.font = `400 26px ${font}`; ctx.fillStyle = 'rgba(220,233,251,.86)';
    ctx.fillText(fit(ctx, track.shortTitle || track.title, max), x + P, y + H - P);
    ctx.restore();
  }

  function createRing(root, {tracks, chapters, reducedMotion, onSelect}) {
    const canvas = root.querySelector('canvas');
    const eraItems = chapters.map((_, era) => tracks.filter(t => t.chapter === era).slice(0, MAX_CARDS));
    const css = rootStyle();
    const fonts = {font: css.getPropertyValue('--font').trim() || 'system-ui, sans-serif', mono: css.getPropertyValue('--mono').trim() || 'ui-monospace, monospace'};
    let current = 0, era = -1, targetEra = -1, targetIdx = 0, items = [];

    const listText = list => list.map((t, i) => `<span role="option" id="molten-opt-${t.id}" aria-selected="false" aria-posinset="${i + 1}" aria-setsize="${list.length}">${esc(t.date)}: ${esc(t.artist)}, ${esc(t.shortTitle || t.title)}</span>`).join('');
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    const markOptions = () => {
      canvas.querySelectorAll('[role=option]').forEach(o => o.setAttribute('aria-selected', String(o.id === 'molten-opt-' + current)));
      canvas.setAttribute('aria-activedescendant', 'molten-opt-' + current);
    };

    // ---- flat fallback: a row of buttons -----------------------------------
    let flat = null;
    const goFlat = () => {
      if (flat) return;
      root.classList.add('molten-flat');
      flat = document.createElement('div');
      flat.className = 'molten-row';
      flat.setAttribute('role', 'group');
      flat.setAttribute('aria-label', 'Recordings in this era');
      root.append(flat);
      flat.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) onSelect(Number(b.dataset.id)); });
      renderFlat(true);
    };
    let flatEra = -1;
    const renderFlat = force => {
      if (!flat || !tracks[current - 1]) return;
      const t = tracks[current - 1];
      if (force || flatEra !== t.chapter) {
        flatEra = t.chapter;
        flat.innerHTML = eraItems[flatEra].map(item => `<button type="button" class="molten-chip" data-id="${item.id}"><span>${esc(item.date)}</span><b>${esc(item.artist)}</b><i>${esc(item.shortTitle || item.title)}</i></button>`).join('');
      }
      flat.querySelectorAll('[data-id]').forEach(b => {
        const on = Number(b.dataset.id) === current;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        if (on) flat.scrollTo({left: b.offsetLeft - (flat.clientWidth - b.offsetWidth) / 2, behavior: reducedMotion ? 'instant' : 'smooth'});
      });
    };

    const gl = canvas.getContext('webgl2', {alpha: true, premultipliedAlpha: false, antialias: false});
    const program = gl && build(gl);
    if (!gl || !program) {
      goFlat();
      return {update(id) { current = id; renderFlat(); }};
    }
    const u = (() => { const cache = new Map(); return name => { let l = cache.get(name); if (l === undefined) { l = gl.getUniformLocation(program, name); cache.set(name, l); } return l; }; })();
    const quad = gl.createVertexArray();
    gl.bindVertexArray(quad);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    let lost = false;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; goFlat(); renderFlat(true); });

    // ---- atlases, one per era, the three most recent kept ------------------
    const atlases = new Map(), building = new Set();
    const artFor = (t, priority) => paint(palette(t.chapter), t.id * 13 + 1, ART_W, ART_H, priority);
    const ensureAtlas = e => {
      if (atlases.has(e) || building.has(e)) return;
      building.add(e);
      const list = eraItems[e];
      Promise.all([Promise.all(list.map(t => artFor(t, 0))), loadFonts(fonts.font, fonts.mono)]).then(([arts]) => {
        building.delete(e);
        if (lost) return;
        const cols = Math.min(3, list.length), rows = Math.ceil(list.length / cols);
        const sheet = document.createElement('canvas');
        sheet.width = cols * CELL_W; sheet.height = rows * CELL_H;
        const ctx = sheet.getContext('2d');
        if (!ctx) return;
        list.forEach((t, i) => drawCard(ctx, (i % cols) * CELL_W, Math.floor(i / cols) * CELL_H, t, arts[i], i, list.length, fonts));
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        atlases.set(e, {tex, cols, rows});
        while (atlases.size > 3) {
          const oldest = [...atlases.keys()].find(k => k !== era && k !== targetEra);
          if (oldest === undefined) break;
          gl.deleteTexture(atlases.get(oldest).tex); atlases.delete(oldest);
        }
        // The neighbouring eras are the likeliest next stop.
        for (const n of [e + 1, e - 1]) if (eraItems[n]) eraItems[n].forEach(t => artFor(t, 3));
        wake();
      }).catch(error => {
        // A ring that never pours is worse than plain buttons.
        building.delete(e);
        console.warn('History eras: the recordings could not be drawn', error);
        lost = true; goFlat(); renderFlat(true);
      });
    };

    // ---- state -----------------------------------------------------------
    let width = 0, height = 0, progress = 0, goal = 0, lastInput = 0, snapped = true, tween = null;
    let phase = 'wait', spread = 0, entry = 0, gatherFrom = 1, gatherAt = 0;
    let hovered = -1, pointerX = -1, pointerY = -1, pointerSpeed = 0, clock = 0, previous = 0, raf = 0, visible = true;
    let cardW = 240, cardH = 135;
    const leanX = new Float32Array(MAX_CARDS), leanY = new Float32Array(MAX_CARDS), swell = new Float32Array(MAX_CARDS), dim = new Float32Array(MAX_CARDS);
    const at = Array.from({length: MAX_CARDS}, () => ({s: 0, x: 0, y: 0, angle: 0, scale: 0, light: 1}));
    const order = [];
    const pos = new Float32Array(MAX_CARDS * 2), rot = new Float32Array(MAX_CARDS), state = new Float32Array(MAX_CARDS * 4);
    const strandA = new Float32Array(MAX_STRANDS * 2), strandB = new Float32Array(MAX_STRANDS * 2), strandPar = new Float32Array(MAX_STRANDS * 4);

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) { width = height = 0; return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = w; height = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      cardW = w < 600 ? w * .58 : clamp(w * .25, 200, 290);
      cardH = cardW * CELL_H / CELL_W;
      if (cardH > h * .74) { cardH = h * .74; cardW = cardH * CELL_W / CELL_H; }
      wake();
    };
    new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) wake(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

    const startTween = to => { tween = {from: goal, to, at: performance.now()}; snapped = true; wake(); };
    const commit = idx => { const t = items[idx]; if (t && t.id !== current) onSelect(t.id); };
    const goTo = (idx, select) => { startTween(idx); if (select) commit(idx); };
    const crossEra = dir => {
      const id = dir > 0 ? items[items.length - 1].id + 1 : items[0].id - 1;
      if (id < 1 || id > tracks.length) return false;
      onSelect(id); return true;
    };
    const swapEra = () => {
      era = targetEra; items = eraItems[era];
      progress = goal = targetIdx; tween = null; snapped = true; hovered = -1;
      leanX.fill(0); leanY.fill(0); swell.fill(0); dim.fill(0);
      canvas.innerHTML = listText(items); markOptions();
      phase = 'wait'; spread = 0; entry = 0;
      ensureAtlas(era);
    };

    // ---- input -----------------------------------------------------------
    const soft = v => clamp(v, -.45, items.length - 1 + .45);
    canvas.addEventListener('wheel', e => {
      if (phase !== 'idle' && phase !== 'pour') return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal && !e.shiftKey) return;
      e.preventDefault();
      const d = (horizontal ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
      tween = null; goal = soft(goal + d * WHEEL); lastInput = performance.now(); snapped = false; wake();
    }, {passive: false});

    let drag = null;
    const toStage = e => { const box = canvas.getBoundingClientRect(); return [e.clientX - box.left, e.clientY - box.top]; };
    const hitTest = (x, y) => {
      const mx = x - width / 2, my = height / 2 - y;
      for (const i of order) {
        const c = at[i], ca = Math.cos(c.angle), sa = Math.sin(c.angle), qx = mx - c.x, qy = my - c.y;
        const rx = qx * ca + qy * sa, ry = -qx * sa + qy * ca;
        if (Math.abs(rx) <= cardW * c.scale / 2 && Math.abs(ry) <= cardH * c.scale / 2) return i;
      }
      return -1;
    };
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 || (phase !== 'idle' && phase !== 'pour')) return;
      drag = {id: e.pointerId, x: e.clientX, y: e.clientY, goal, raw: goal, lastX: e.clientX, lastT: e.timeStamp, v: 0, captured: false};
    });
    canvas.addEventListener('pointermove', e => {
      const [nx, ny] = toStage(e);
      pointerSpeed = pointerX < 0 ? 0 : Math.hypot(nx - pointerX, ny - pointerY);
      pointerX = nx; pointerY = ny;
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.captured) {
          if (Math.abs(dx) < CLICK_SLOP) { wake(); return; }
          if (Math.abs(dy) > Math.abs(dx)) { drag = null; wake(); return; }
          drag.captured = true; tween = null;
          try { canvas.setPointerCapture(e.pointerId); } catch {}
          root.classList.add('dragging');
        }
        const unit = cardW * 1.05, raw = drag.goal - dx / unit;
        const n = items.length - 1, rubber = v => .5 * (1 - Math.exp(-v * 1.6));
        drag.raw = raw;
        goal = raw < 0 ? -rubber(-raw) : raw > n ? n + rubber(raw - n) : raw;
        const dt = Math.max(1, e.timeStamp - drag.lastT);
        drag.v = .75 * drag.v + .25 * (-(e.clientX - drag.lastX) / unit) / (dt / 1000);
        drag.lastX = e.clientX; drag.lastT = e.timeStamp;
        snapped = false; lastInput = performance.now();
      }
      wake();
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null; root.classList.remove('dragging');
      if (!d.captured) {
        if (e.type === 'pointercancel') return;
        const [x, y] = toStage(e), hit = hitTest(x, y);
        if (hit >= 0) goTo(hit, true);
        return;
      }
      const n = items.length - 1;
      if (d.raw > n + .55 && crossEra(1)) return;
      if (d.raw < -.55 && crossEra(-1)) return;
      goTo(clamp(Math.round(goal + clamp(d.v, -6, 6) * .07), 0, n), true);
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', () => { if (!drag) { pointerX = pointerY = -1; hovered = -1; canvas.style.cursor = ''; wake(); } });
    canvas.addEventListener('keydown', e => {
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); goTo(e.key === 'Home' ? 0 : items.length - 1, true); }
    });

    // ---- frame -----------------------------------------------------------
    function wake() { if (!raf && !lost) raf = requestAnimationFrame(draw); }
    function settled() {
      if (phase !== 'idle' || tween || !snapped || drag || Math.abs(goal - progress) > .0005 || pointerX >= 0 || pointerSpeed > .3) return false;
      for (let i = 0; i < items.length; i++) if (Math.abs(leanX[i]) > .05 || Math.abs(leanY[i]) > .05 || swell[i] > .0005 || dim[i] > .0005) return false;
      return true;
    }
    function draw(now) {
      raf = 0;
      if (!width || !height || lost || !visible || document.hidden || era < 0) { previous = 0; return; }
      const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 0;
      previous = now; clock += dt;
      const f60 = dt * 60;

      // phases: gather the old era into a drop, wait for the new art, pour it out
      if (phase === 'gather') {
        const t = clamp((now - gatherAt) / GATHER_MS, 0, 1);
        spread = gatherFrom * (1 - inCubic(t));
        if (t >= 1) swapEra();
      }
      if (phase === 'wait') {
        if (targetEra !== era) swapEra();
        spread = 0;
        if (atlases.has(era)) { phase = reducedMotion ? 'idle' : 'pour'; entry = reducedMotion ? 1 : 0; spread = reducedMotion ? 1 : 0; }
      }
      if (phase === 'pour') {
        entry = Math.min(1, entry + dt * 1000 / POUR_MS);
        spread = inOutCubic(entry);
        if (entry >= 1) phase = 'idle';
      }
      const atlas = atlases.get(era);
      const n = items.length;

      // turn
      if (tween) {
        const t = clamp((now - tween.at) / TWEEN_MS, 0, 1);
        goal = tween.from + (tween.to - tween.from) * outCubic(t);
        if (t >= 1) tween = null;
      } else if (!snapped && !drag && now - lastInput > SNAP_IDLE) {
        const target = clamp(Math.round(goal), 0, n - 1);
        startTween(target); commit(target);
      }
      const ease = reducedMotion ? 1 : 1 - Math.pow(1 - (snapped ? SNAP_EASE : EASE), f60);
      progress += (goal - progress) * ease;
      if (Math.abs(goal - progress) < .0005) progress = goal;
      const speed = Math.abs(goal - progress);

      // geometry: a gentle arc, the front card square on, the rest melting together
      const W = cardW, H = cardH, R = Math.max(width * 1.6, 900), y0 = height * (width < 600 ? -.02 : .05), half = width / 2;
      for (let i = 0; i < n; i++) {
        const c = at[i], s = i - progress, ss = s * spread;
        c.s = s;
        c.x = W * (.5 * ss + .83 * Math.tanh(.84 * ss));
        c.y = y0 - c.x * c.x / (2 * R) + (1 - spread) * height * .62;
        c.angle = -c.x / R * .5;
        c.base = (.18 + .82 * spread) * (.5 + .5 * Math.exp(-.35 * s * s));
        c.light = .42 + .58 * Math.exp(-.55 * s * s);
      }

      // pointer
      const present = pointerX >= 0 && phase === 'idle' ? 1 : 0;
      const mx = present ? pointerX - half : 0, my = present ? height / 2 - pointerY : 0;
      if (present && !drag && pointerSpeed < 24) {
        hovered = -1;
        let best = Infinity;
        for (let i = 0; i < n; i++) {
          const dx = Math.abs(mx - at[i].x), dy = Math.abs(my - at[i].y);
          if (dx > W * at[i].base / 2 || dy > H * at[i].base / 2) continue;
          if (Math.abs(at[i].s) < best) { best = Math.abs(at[i].s); hovered = i; }
        }
        canvas.style.cursor = hovered >= 0 && Math.round(goal) !== hovered ? 'pointer' : '';
      }
      if (!present) hovered = -1;
      pointerSpeed *= Math.pow(.85, f60);

      for (let i = 0; i < n; i++) {
        const c = at[i], dx = mx - c.x, dy = my - c.y;
        const pull = present ? Math.max(0, 1 - Math.hypot(dx, dy) / (W * REACH)) : 0;
        const grab = 1 - Math.pow(1 - GRAB, f60), letGo = 1 - Math.pow(1 - RELEASE, f60);
        leanX[i] += (dx * pull * pull * PULL * W * .02 - leanX[i]) * (pull > 0 ? grab : letGo);
        leanY[i] += (dy * pull * pull * PULL * W * .02 - leanY[i]) * (pull > 0 ? grab : letGo);
        let push = 0, dimTarget = 0;
        if (hovered >= 0 && i !== hovered) {
          const off = Math.max(0, 1 - Math.abs(i - hovered) / NEIGHBOUR_REACH);
          push = Math.sign(i - hovered) * off * NEIGHBOUR_PUSH * W;
          dimTarget = off * NEIGHBOUR_DIM;
        }
        dim[i] += (dimTarget - dim[i]) * (dimTarget > dim[i] ? grab : letGo);
        const want = pull * pull * SWELL + (i === hovered ? NEIGHBOUR_SCALE : 0) - dimTarget * (NEIGHBOUR_SCALE / NEIGHBOUR_DIM);
        swell[i] += (want - swell[i]) * (want > swell[i] ? grab : letGo);
        c.x += leanX[i] + push; c.y += leanY[i];
        c.scale = Math.abs(c.x) > half + W ? 0 : c.base * (1 + swell[i]);
      }

      // front-most first, so it wins wherever cards coincide
      order.length = 0;
      for (let i = 0; i < n; i++) order.push(i);
      order.sort((a, b) => Math.abs(at[a].s) - Math.abs(at[b].s));
      order.forEach((i, k) => {
        pos[k * 2] = at[i].x; pos[k * 2 + 1] = at[i].y; rot[k] = at[i].angle;
        state[k * 4] = state[k * 4 + 1] = at[i].scale; state[k * 4 + 2] = at[i].light * (1 - dim[i]); state[k * 4 + 3] = i;
      });

      // strands between neighbours: while the era pours out, and around the card under the pointer
      let strands = 0;
      for (let i = 0; i + 1 < n && strands < MAX_STRANDS; i++) {
        const j = i + 1, a = at[i], b = at[j];
        if (!a.scale || !b.scale) continue;
        const gap = Math.hypot(b.x - a.x, b.y - a.y) - W * (a.scale + b.scale) / 2;
        const opening = gap / (W * STRAND_SNAP);
        if (opening > 1 || opening < -1) continue;
        const strength = Math.max(1 - spread, hovered === i || hovered === j ? 1 : 0);
        if (strength < .02) continue;
        const rEnd = H * .5 * Math.min(1, Math.max(a.scale, b.scale)) * STRAND * strength * (1 - clamp(opening, 0, 1));
        if (rEnd <= .5) continue;
        strandA[strands * 2] = a.x; strandA[strands * 2 + 1] = a.y;
        strandB[strands * 2] = b.x; strandB[strands * 2 + 1] = b.y;
        strandPar[strands * 4] = rEnd; strandPar[strands * 4 + 1] = rEnd * WAIST;
        strandPar[strands * 4 + 2] = SAG * W * clamp(opening, 0, 1); strandPar[strands * 4 + 3] = WELD * W;
        strands++;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(quad);
      gl.uniform2f(u('uResolution'), width, height);
      gl.uniform2f(u('uSize'), W, H);
      gl.uniform1f(u('uCorner'), CORNER * W);
      gl.uniform1f(u('uCount'), n);
      gl.uniform2fv(u('uCentre'), pos);
      gl.uniform1fv(u('uAngle'), rot);
      gl.uniform4fv(u('uCardState'), state);
      gl.uniform1f(u('uStrandCount'), strands);
      gl.uniform2fv(u('uStrandA'), strandA);
      gl.uniform2fv(u('uStrandB'), strandB);
      gl.uniform4fv(u('uStrandPar'), strandPar);
      gl.uniform1f(u('uFuse'), FUSE * W);
      gl.uniform1f(u('uJitter'), reducedMotion ? 0 : WOBBLE * W * clamp(speed * 2 + (1 - spread), 0, 1));
      gl.uniform1f(u('uTime'), reducedMotion ? 0 : clock);
      const ink = hexToRgb(palette(Math.max(era, 0)).colors[2]);
      gl.uniform3f(u('uColor'), ink[0] / 255, ink[1] / 255, ink[2] / 255);
      gl.uniform1f(u('uCrossfade'), CROSSFADE * W);
      gl.uniform1f(u('uHasArt'), atlas ? 1 : 0);
      gl.uniform2f(u('uGrid'), atlas ? atlas.cols : 1, atlas ? atlas.rows : 1);
      gl.uniform4f(u('uCursor'), mx, my, present, CURSOR_FUSE * W);
      gl.uniform4f(u('uWake'), CURSOR_REACH * W, reducedMotion ? 0 : WAVE * W * clamp(pointerSpeed / 40, 0, 1), WAVE_FREQ / W, WAVE_SPEED);
      gl.uniform1f(u('uLipDepth'), BAND * width);
      gl.uniform4f(u('uLip'), REFRACT * W, SQUEEZE, RIPPLE * W, RIPPLE_FREQ / W);
      gl.uniform1f(u('uFringe'), FRINGE);
      gl.uniform1f(u('uSheen'), SHEEN);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas ? atlas.tex : null);
      gl.uniform1i(u('uAtlas'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (settled()) previous = 0; else raf = requestAnimationFrame(draw);
    }

    return {
      update(id) {
        current = id;
        if (flat) { renderFlat(); return; }
        const t = tracks[id - 1], idx = Math.max(0, eraItems[t.chapter].indexOf(t));
        targetIdx = idx;
        if (era < 0) { targetEra = t.chapter; swapEra(); }
        else if (t.chapter !== targetEra) {
          // A new era: gather the open one into a drop first. A gather already
          // under way, or a wait for art, picks up the new target when it swaps.
          targetEra = t.chapter;
          if (reducedMotion) swapEra();
          else if (phase === 'idle' || phase === 'pour') { phase = 'gather'; gatherFrom = spread; gatherAt = performance.now(); drag = null; }
        } else if (t.chapter === era && phase === 'wait') { progress = goal = idx; }
        else if (t.chapter === era && !drag && (tween ? tween.to : Math.round(goal)) !== idx) startTween(idx);
        markOptions();
        wake();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Era folders: back-panel art, accents, and a light that follows the pointer.

  function dressFolders(strip, chapters) {
    strip.querySelectorAll('[data-history-period]').forEach(button => {
      const era = Number(button.dataset.historyPeriod), p = palette(era);
      button.style.setProperty('--era-a', p.colors[2]);
      button.style.setProperty('--era-b', p.colors[5]);
      const canvas = button.querySelector('canvas[data-era-art]');
      if (!canvas) return;
      const w = 176, h = 124;
      paint(p, era * 7 + 3, w, h, 1).then(src => {
        canvas.width = src.width; canvas.height = src.height;
        canvas.getContext('2d')?.drawImage(src, 0, 0);
        canvas.dataset.ready = '';
      });
    });
    let raf = 0, target = null, px = 0, py = 0;
    const write = () => { raf = 0; if (!target) return; target.style.setProperty('--px', px.toFixed(3)); target.style.setProperty('--py', py.toFixed(3)); };
    strip.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const folder = e.target.closest('[data-history-period]');
      if (folder !== target && target) { target.style.setProperty('--px', '0'); target.style.setProperty('--py', '0'); }
      target = folder;
      if (!folder) return;
      const r = folder.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width * 2 - 1; py = (e.clientY - r.top) / r.height * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    });
    strip.addEventListener('pointerleave', () => { if (target) { target.style.setProperty('--px', '0'); target.style.setProperty('--py', '0'); } target = null; });
  }

  window.ResonanceEras = {
    mount({root, strip, tracks, chapters, reducedMotion = false, onSelect}) {
      if (strip) dressFolders(strip, chapters);
      const ring = root ? createRing(root, {tracks, chapters, reducedMotion, onSelect}) : null;
      return {update(id) { ring?.update(id); }};
    },
  };
})();
