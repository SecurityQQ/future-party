"use client";
import { useEffect, useRef } from "react";

// The backdrop behind the whole app, in three canvases:
//   neb    – painted once: a noise nebula, a Milky Way band and thousands of faint far stars
//   stars  – animated: near stars drifting in parallax, twinkling, with the odd shooting star
//   planet – painted once: a banded, ringed gas giant in the bottom-right corner

type Rand = () => number;
type RGB = [number, number, number];

function mulberry32(seed: number): Rand {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function makeNoise(rand: Rand) {
  const g = new Float32Array(256 * 256);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x: number, y: number) => g[((y & 255) << 8) | (x & 255)];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x: number, y: number, oct: number) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return s / (1 - 0.5 ** oct);
  };
  return { noise, fbm };
}
type Noise = ReturnType<typeof makeNoise>;

// Navy space, cobalt atmosphere and silver-white reflections from the vibes reference board.
const STAR_COLORS: RGB[] = [[239, 246, 255], [207, 230, 255], [168, 201, 255], [191, 228, 255], [225, 235, 255], [119, 169, 255]];

// ---------- far layer: nebula + Milky Way + static stars ----------
function paintNebula(c: HTMLCanvasElement, seed: number) {
  const rand = mulberry32(seed);
  const { fbm } = makeNoise(rand);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d")!;

  // The clouds are computed small and scaled up: they are soft anyway.
  const L = Math.max(w, h);
  const k = Math.min(1, (L > 1000 ? 380 : 300) / L);
  const nw = Math.max(2, Math.round(w * k)), nh = Math.max(2, Math.round(h * k));
  const nl = Math.max(nw, nh);
  const small = document.createElement("canvas");
  small.width = nw; small.height = nh;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(nw, nh);
  const d = img.data;

  // The galactic band runs diagonally through a point a little off-centre.
  const theta = (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.25);
  const sn = Math.sin(theta), cs = Math.cos(theta);
  const bx = 0.5 + (rand() - 0.5) * 0.2, by = 0.42 + (rand() - 0.5) * 0.15;
  const navy: RGB = [20, 40, 100], cobalt: RGB = [34, 96, 220], silver: RGB = [146, 184, 230], blue: RGB = [40, 73, 168];

  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const px = (x / nl) * 3.2, py = (y / nl) * 3.2;
      const qx = fbm(px + 1.7, py + 9.2, 3), qy = fbm(px + 8.3, py + 2.8, 3);
      const n = fbm(px + 2.4 * qx, py + 2.4 * qy, 5);
      const cloud = smooth(0.4, 0.76, n);
      const dist = ((x - nw * bx) * sn - (y - nh * by) * cs) / nl;
      const band = Math.exp(-((dist / 0.17) ** 2));
      let dens = cloud * (0.44 + 0.56 * band) + band * 0.1;
      const dust = smooth(0.48, 0.72, fbm(px * 1.9 + 90 + qx, py * 1.9 + 40 + qy, 4));
      dens *= 1 - dust * (0.25 + 0.6 * band);
      const hs = smooth(0.32, 0.68, fbm(px * 0.6 + 31, py * 0.6 + 17, 3));
      const ms = smooth(0.52, 0.78, fbm(px * 0.9 + 50, py * 0.9 + 70, 3)) * 0.65;
      const bs = smooth(0.5, 0.8, fbm(px * 0.5 + 11, py * 0.5 + 63, 2)) * 0.5;
      const core = dens * dens * dens;
      const i = (y * nw + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let v = navy[ch] + (cobalt[ch] - navy[ch]) * hs;
        v += (silver[ch] - v) * ms;
        v += (blue[ch] - v) * bs;
        d[i + ch] = Math.min(255, v + core * 80 + band * 14);
      }
      d[i + 3] = Math.min(255, dens * 170);
    }
  }
  sctx.putImageData(img, 0, 0);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, w, h);

  // Far stars: a sharp dusting everywhere, much denser along the band.
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
  const count = Math.round((w * h) / 520);
  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    if (rand() < 0.5) {
      const t = (rand() - 0.5) * 1.6 * L, o = gauss() * 0.2 * L;
      x = w * bx + t * cs + o * sn; y = h * by + t * sn - o * cs;
      if (x < 0 || x > w || y < 0 || y > h) { x = rand() * w; y = rand() * h; }
    } else { x = rand() * w; y = rand() * h; }
    const m = rand() ** 3;
    const col = STAR_COLORS[(rand() * STAR_COLORS.length) | 0];
    const s = 0.5 + m * 1.1;
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.16 + m * 0.75})`;
    ctx.fillRect(x, y, s, s);
  }
  // A few bright far stars with a halo.
  const bright = Math.round(count / 70);
  for (let i = 0; i < bright; i++) {
    const x = rand() * w, y = rand() * h, r = 3 + rand() * 6;
    const col = STAR_COLORS[(rand() * STAR_COLORS.length) | 0];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.9)`);
    g.addColorStop(0.18, `rgba(${col[0]},${col[1]},${col[2]},0.28)`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// ---------- the ringed planet ----------
const RAMP: [number, RGB][] = [
  [0, [7, 19, 48]], [0.28, [22, 58, 126]], [0.52, [45, 107, 208]], [0.7, [128, 177, 237]],
  [0.84, [222, 234, 250]], [1, [73, 128, 210]],
];
function ramp(v: number, ch: number) {
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i];
      return ca[ch] + (cb[ch] - ca[ch]) * ((v - a) / (b - a));
    }
  }
  return RAMP[RAMP.length - 1][1][ch];
}

function paintPlanet(c: HTMLCanvasElement, seed: number) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const { noise, fbm } = makeNoise(rand);
  const css = c.clientWidth;
  if (!css) return;
  const P = Math.round(Math.min(1400, css * Math.min(2, window.devicePixelRatio || 1)));
  c.width = P; c.height = P;
  const ctx = c.getContext("2d")!;
  const cx = P / 2, cy = P / 2, R = P * 0.22;
  const tilt = 0.32, squash = 0.26;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const ce = Math.sqrt(1 - squash * squash), se = squash;
  const lx = -0.6, ly = -0.55, lz = 0.58;

  // Atmosphere halo, pulled toward the light.
  const halo = ctx.createRadialGradient(cx + lx * R * 0.06, cy + ly * R * 0.06, R * 0.9, cx, cy, R * 1.22);
  halo.addColorStop(0, "rgba(122,176,255,0.32)");
  halo.addColorStop(0.35, "rgba(75,132,255,0.12)");
  halo.addColorStop(1, "rgba(75,132,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, P, P);

  const rings = (from: number, to: number) => {
    const inner = R * 1.32, outer = R * 2.2, step = Math.max(1, P / 900);
    ctx.lineWidth = step + 0.7;
    for (let r = inner; r < outer; r += step) {
      const t = (r - inner) / (outer - inner);
      let a = 0.2 + 0.8 * noise(t * 16 + 3, 3.3) * (0.6 + 0.4 * noise(t * 70, 8.1));
      if (t > 0.56 && t < 0.63) a *= 0.07;
      a *= smooth(0, 0.05, t) * (1 - smooth(0.88, 1, t));
      const m = noise(t * 5, 9.7);
      const cr = 226 + (109 - 226) * m, cg = 236 + (156 - 236) * m, cb = 252 + (226 - 252) * m;
      ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${(a * 0.62).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * squash, tilt, from, to);
      ctx.stroke();
    }
  };
  rings(Math.PI, Math.PI * 2); // the half behind the planet

  // The globe, shaded per pixel.
  const D = Math.ceil(R * 2) + 2;
  const globe = document.createElement("canvas");
  globe.width = D; globe.height = D;
  const gctx = globe.getContext("2d")!;
  const img = gctx.createImageData(D, D);
  const d = img.data;
  for (let py = 0; py < D; py++) {
    for (let px = 0; px < D; px++) {
      const x = (px - D / 2 + 0.5) / R, y = (py - D / 2 + 0.5) / R;
      const r2 = x * x + y * y;
      const edge = (1 - Math.sqrt(r2)) * R;
      if (edge <= 0) continue;
      const z = Math.sqrt(Math.max(0, 1 - r2));
      const xr = x * ct + y * st, yr = -x * st + y * ct;
      const lat = yr * ce - z * se;
      const lon = Math.atan2(xr, z * ce + yr * se);
      const turb = fbm(lon * 2.4 + 3, lat * 4 + 7, 3);
      const stripes = 0.5 + 0.5 * Math.sin(lat * 12 + 2.6 * (turb - 0.5) + 1.3);
      const detail = smooth(0.25, 0.75, fbm(lon * 0.9 + 5, lat * 6 + 0.9 * turb, 4));
      const v = clamp01(0.5 * stripes + 0.5 * detail);
      const nd = x * lx + y * ly + z * lz;
      const lit = smooth(-0.18, 0.85, nd);
      const shade = 0.03 + 0.85 * lit;
      const rim = (1 - z) ** 2.5 * lit;
      const i = (py * D + px) * 4;
      d[i] = Math.min(255, ramp(v, 0) * shade + 100 * rim);
      d[i + 1] = Math.min(255, ramp(v, 1) * shade + 160 * rim);
      d[i + 2] = Math.min(255, ramp(v, 2) * shade + 250 * rim);
      d[i + 3] = 255 * clamp01(edge);
    }
  }
  gctx.putImageData(img, 0, 0);
  ctx.drawImage(globe, cx - D / 2, cy - D / 2);

  rings(0, Math.PI); // the half in front
}

export default function Starfield() {
  const nebRef = useRef<HTMLCanvasElement>(null);
  const starRef = useRef<HTMLCanvasElement>(null);
  const planetRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = starRef.current!, neb = nebRef.current!, planet = planetRef.current!;
    const ctx = c.getContext("2d")!;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = motion.matches;
    const seed = (Math.random() * 2 ** 31) | 0;
    let w = 0, h = 0, raf = 0, last = 0, elapsed = 0, builtW = 0, builtH = 0, idle = 0;

    // One soft glow sprite per star colour.
    const sprites = STAR_COLORS.map(([r, g, b]) => {
      const s = document.createElement("canvas");
      s.width = s.height = 64;
      const sc = s.getContext("2d")!;
      const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.12, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sc.fillStyle = grad;
      sc.fillRect(0, 0, 64, 64);
      return s;
    });

    type Star = { x: number; y: number; z: number; p: number; sp: number; tw: number; c: number };
    type Meteor = { x: number; y: number; vx: number; vy: number; age: number; life: number; len: number };
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteor = 12 + Math.random() * 10;

    const paintFar = () => {
      paintNebula(neb, seed);
      paintPlanet(planet, seed);
      neb.style.opacity = "1";
      planet.style.opacity = "1";
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 4200);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() ** 2.4,
        p: Math.random() * Math.PI * 2, sp: 0.18 + Math.random() * 0.37,
        tw: Math.random() < 0.35 ? 0.25 : 0.08, c: (Math.random() * STAR_COLORS.length) | 0,
      }));
      // The far layer is costly to repaint, so skip it when only the browser bar moved.
      if (w !== builtW || Math.abs(h - builtH) > 140) {
        builtW = w; builtH = h;
        clearTimeout(idle);
        idle = window.setTimeout(paintFar, 30);
      }
      if (!raf) draw(performance.now());
    };

    const draw = (time: number) => {
      raf = 0;
      const animate = !reduce && !document.hidden;
      const now = time / 1000;
      const dt = animate && last ? Math.min(0.05, now - last) : 0;
      last = animate ? now : 0;
      // Animation time pauses with the tab, so stars never jump on returning.
      elapsed += dt;
      const t = elapsed;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (animate) {
          const v = 1 + s.z * 4;
          s.y += v * dt; s.x -= v * 0.28 * dt;
          if (s.y > h + 12) { s.y = -12; s.x = Math.random() * w; }
          if (s.x < -12) s.x = w + 12;
        }
        const tw = 1 - s.tw + s.tw * (0.5 + 0.5 * Math.sin(t * s.sp + s.p) * Math.sin(t * s.sp * 0.37 + s.p * 2));
        const a = (0.3 + s.z * 0.7) * tw;
        const r = 0.45 + s.z * 1.25;
        const col = STAR_COLORS[s.c];
        if (s.z > 0.45) {
          const g = r * (5 + s.z * 6);
          ctx.globalAlpha = a * 0.75;
          ctx.drawImage(sprites[s.c], s.x - g, s.y - g, g * 2, g * 2);
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        if (s.z > 0.8) {
          const l = r * (5 + 4 * tw);
          ctx.globalAlpha = a * 0.4;
          ctx.fillRect(s.x - l, s.y - 0.3, l * 2, 0.6);
          ctx.fillRect(s.x - 0.3, s.y - l, 0.6, l * 2);
        }
      }
      ctx.globalAlpha = 1;

      if (animate) {
        if (!meteor && t > nextMeteor) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const ang = 0.35 + Math.random() * 0.4, sp = 240 + Math.random() * 160;
          meteor = {
            x: w * (0.5 - dir * (0.1 + Math.random() * 0.4)), y: h * Math.random() * 0.45,
            vx: dir * Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            age: 0, life: 1.2 + Math.random() * 0.6, len: 80 + Math.random() * 60,
          };
        }
        if (meteor) {
          const m = meteor;
          m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt;
          const f = m.age / m.life;
          if (f >= 1) { meteor = null; nextMeteor = t + 18 + Math.random() * 14; }
          else {
            const a = Math.sin(Math.PI * f);
            const sp = Math.hypot(m.vx, m.vy);
            const len = m.len * Math.min(1, f * 3);
            const tx = m.x - (m.vx / sp) * len, ty = m.y - (m.vy / sp) * len;
            const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
            g.addColorStop(0, `rgba(255,255,255,${a})`);
            g.addColorStop(0.25, `rgba(160,205,255,${a * 0.5})`);
            g.addColorStop(1, "rgba(120,160,255,0)");
            ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.globalAlpha = a;
            ctx.drawImage(sprites[3], m.x - 9, m.y - 9, 18, 18);
            ctx.globalAlpha = 1;
          }
        }
        raf = requestAnimationFrame(draw);
      }
    };

    const syncMotion = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      reduce = motion.matches;
      meteor = null;
      nextMeteor = elapsed + 12 + Math.random() * 10;
      // Render one still frame when reduced motion or a hidden tab stops the loop.
      draw(performance.now());
    };

    resize();
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="sky" aria-hidden>
      <canvas className="neb" ref={nebRef} />
      <canvas className="stars" ref={starRef} />
      <canvas className="planet" ref={planetRef} />
    </div>
  );
}
