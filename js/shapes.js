/* shapes.js — Forme Atelier generator engine (no DOM, also runs under Node for the tests).
 * Turns a plain "settings" object into an optimised SVG string. Everything is deterministic: the same settings and
 * seed always give the exact same drawing, which is what makes the share links, favourites and undo history work.
 * Generators: blob, wave, layered waves, topographic contours, scattered scene, low-poly, peaks.
 * Original code written for this project — MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SHAPES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ seeded randomness */
  /** Small, fast 32-bit PRNG (splitmix-style mixing). Returns a function giving floats in [0, 1). */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x9e3779b9) | 0;
      let z = a;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      z ^= z >>> 16;
      return (z >>> 0) / 4294967296;
    };
  }
  /** Turns any text into a stable 31-bit seed (used when someone types letters in the seed field). */
  function hashSeed(text) {
    let h = 2166136261;
    for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 100000000;
  }

  /** 2D gradient noise: random unit gradients on an integer lattice, quintic fade. Output roughly in [-1, 1]. */
  function makeNoise(rand) {
    const perm = new Uint16Array(512), gx = new Float64Array(256), gy = new Float64Array(256);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) { const a = rand() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const dot = (h, x, y) => gx[h] * x + gy[h] * y;
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
      const u = fade(xf), v = fade(yf);
      const x1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
      const x2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
      return (x1 + v * (x2 - x1)) * 1.41;
    };
  }
  /** Fractal sum of several noise octaves, normalised to about [-1, 1]. */
  function fbm(noise, x, y, octaves) {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { s += amp * noise(x * f + o * 17.3, y * f - o * 9.1); norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  }

  /* ------------------------------------------------------------------ colours */
  const HEX = /^#[0-9a-f]{6}$/i;
  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const toSrgb = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  /** sRGB hex → OKLab (perceptual space, so colour ramps look even). */
  function toLab(hex) {
    const [r, g, b] = hexToRgb(hex).map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromLab([L, A, B]) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3,
      s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return rgbToHex(toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));
  }
  /** Colour at position t (0…1) along the palette, interpolated in OKLab. */
  function ramp(colors, t) {
    if (colors.length === 1) return colors[0].toLowerCase();
    t = Math.max(0, Math.min(1, t)) * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(t)), f = t - i;
    if (f < 1e-6) return colors[i].toLowerCase();
    const a = toLab(colors[i]), b = toLab(colors[i + 1]);
    return fromLab([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  /** Random harmonious palette (analogous, complementary, triadic, monochrome or split). */
  function randomPalette(rand) {
    const h = rand() * 360, kind = Math.floor(rand() * 5), n = 3 + Math.floor(rand() * 3);
    const hues = {
      0: (i) => h + (i - n / 2) * 22, 1: (i) => h + (i % 2) * 180 + i * 6, 2: (i) => h + (i % 3) * 120,
      3: () => h, 4: (i) => h + [0, 150, 210, 30, 180][i % 5],
    }[kind];
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push(hslToHex(hues(i), 45 + rand() * 45, kind === 3 ? 18 + t * 70 : 30 + t * 45 + (rand() - 0.5) * 10));
    }
    return out;
  }

  /* ------------------------------------------------------------------ settings schema */
  /** Per-generator parameters. The interface builds its sliders from this table; normalize() clamps with it. */
  const PARAMS = {
    blob: [
      { k: 'complexity', min: 3, max: 16, step: 1, def: 6 },
      { k: 'contrast', min: 0, max: 1, step: 0.01, def: 0.45, pct: 1 },
      { k: 'size', min: 0.1, max: 1.3, step: 0.01, def: 0.75, pct: 1 },
      { k: 'smooth', min: 0, max: 1.6, step: 0.05, def: 1 },
      { k: 'rings', min: 1, max: 8, step: 1, def: 1 },
      { k: 'cx', min: 0, max: 1, step: 0.01, def: 0.5, pct: 1 },
      { k: 'cy', min: 0, max: 1, step: 0.01, def: 0.5, pct: 1 },
    ],
    wave: [
      { k: 'side', opts: ['bottom', 'top'], def: 'bottom' },
      { k: 'style', opts: ['smooth', 'sharp', 'step'], def: 'smooth' },
      { k: 'height', min: 0.05, max: 0.95, step: 0.01, def: 0.4, pct: 1 },
      { k: 'amplitude', min: 0, max: 0.5, step: 0.01, def: 0.1, pct: 1 },
      { k: 'frequency', min: 1, max: 24, step: 1, def: 4 },
      { k: 'randomness', min: 0, max: 1, step: 0.01, def: 0.5, pct: 1 },
    ],
    layers: [
      { k: 'side', opts: ['bottom', 'top'], def: 'bottom' },
      { k: 'style', opts: ['smooth', 'sharp', 'step'], def: 'smooth' },
      { k: 'count', min: 2, max: 12, step: 1, def: 5 },
      { k: 'height', min: 0.1, max: 1, step: 0.01, def: 0.65, pct: 1 },
      { k: 'amplitude', min: 0, max: 0.4, step: 0.01, def: 0.06, pct: 1 },
      { k: 'frequency', min: 1, max: 24, step: 1, def: 5 },
      { k: 'randomness', min: 0, max: 1, step: 0.01, def: 0.6, pct: 1 },
      { k: 'opacity', min: 0.1, max: 1, step: 0.01, def: 1, pct: 1 },
    ],
    topo: [
      { k: 'lines', min: 3, max: 40, step: 1, def: 14 },
      { k: 'scale', min: 0.5, max: 8, step: 0.1, def: 2.4 },
      { k: 'detail', min: 1, max: 5, step: 1, def: 3 },
      { k: 'lineWidth', min: 0.25, max: 8, step: 0.25, def: 1.5 },
      { k: 'lineColor', opts: ['ramp', 'first', 'last', 'stroke'], def: 'ramp' },
      { k: 'resolution', min: 40, max: 240, step: 10, def: 120 },
      { k: 'showLines', bool: 1, def: true },
      { k: 'bands', bool: 1, def: false },
      { k: 'smoothLines', bool: 1, def: true },
    ],
    scene: [
      { k: 'shape', opts: ['circles', 'blobs', 'rings', 'squares', 'mixed'], def: 'circles' },
      { k: 'count', min: 3, max: 150, step: 1, def: 22 },
      { k: 'sizeMin', min: 0.01, max: 0.5, step: 0.01, def: 0.04, pct: 1 },
      { k: 'sizeMax', min: 0.02, max: 0.8, step: 0.01, def: 0.22, pct: 1 },
      { k: 'opacity', min: 0.1, max: 1, step: 0.01, def: 0.9, pct: 1 },
      { k: 'blur', min: 0, max: 1, step: 0.01, def: 0, pct: 1 },
      { k: 'overlap', bool: 1, def: false },
    ],
    lowpoly: [
      { k: 'cells', min: 3, max: 40, step: 1, def: 12 },
      { k: 'jitter', min: 0, max: 1, step: 0.01, def: 0.7, pct: 1 },
      { k: 'variance', min: 0, max: 1, step: 0.01, def: 0.25, pct: 1 },
      { k: 'angle', min: 0, max: 360, step: 5, def: 45, deg: 1 },
    ],
    peaks: [
      { k: 'count', min: 1, max: 8, step: 1, def: 4 },
      { k: 'height', min: 0.1, max: 1, step: 0.01, def: 0.6, pct: 1 },
      { k: 'rugged', min: 0, max: 1, step: 0.01, def: 0.55, pct: 1 },
      { k: 'detail', min: 2, max: 9, step: 1, def: 7 },
      { k: 'haze', bool: 1, def: true },
      { k: 'sun', bool: 1, def: true },
    ],
  };
  const TYPES = Object.keys(PARAMS);
  const FILLS = ['solid', 'linear', 'radial', 'none'];
  /** Canvas size presets [id, width, height]. */
  const SIZES = [['hd', 1920, 1080], ['square', 1080, 1080], ['story', 1080, 1920], ['portrait', 1080, 1350], ['a4', 2480, 3508],
    ['a4l', 3508, 2480], ['banner', 1500, 500], ['og', 1200, 630]];
  /** Ready-made palettes (original selections). */
  const PALETTES = {
    aurore: ['#ffb38a', '#ff6f61', '#8e3b8a'], lagon: ['#c6f7e2', '#2ec4b6', '#0b6e8a'], sahara: ['#f4d58d', '#e08e45', '#8c3b2e'],
    olivier: ['#dfe7c0', '#8aa45c', '#3d5a2a'], nuit: ['#e85d75', '#3d348b', '#0f1b4c'], menthe: ['#e8fff4', '#7ee2b8', '#1b9c85'],
    brique: ['#f2e3d5', '#d1603d', '#5b2333'], tamazgha: ['#1f6fb2', '#3aa655', '#f2c230', '#d7263d'],
    encre: ['#f2f2f2', '#9a9a9a', '#1e1e1e'], pastel: ['#ffd6e0', '#c1e1ff', '#d8f5c8', '#fff1b8'],
    crepuscule: ['#f9dc5c', '#f18f01', '#a23b72', '#2b1b54'],
  };

  function defaultParams() {
    const p = {};
    for (const t of TYPES) { p[t] = {}; for (const d of PARAMS[t]) p[t][d.k] = d.def; }
    return p;
  }
  /** Fresh default settings. */
  function defaults() {
    return { v: 1, type: 'blob', seed: 2026, size: 'hd', w: 1920, h: 1080, colors: PALETTES.crepuscule.slice(), fill: 'linear',
      angle: 135, stroke: false, strokeColor: '#1e1b2e', strokeWidth: 4, bgOn: true, bg: '#fff6ec', rot: 0, flipX: false,
      flipY: false, p: defaultParams() };
  }
  const num = (v, min, max, def, step) => {
    let n = Number(v);
    if (!Number.isFinite(n)) return def;
    n = Math.max(min, Math.min(max, n));
    if (step >= 1) n = Math.round(n);
    return n;
  };
  /** Cleans any settings object (from the URL, a JSON file or localStorage): unknown keys dropped, numbers clamped,
   * colours checked against #rrggbb. The result can safely be turned into SVG markup. */
  function normalize(src) {
    const d = defaults();
    if (!src || typeof src !== 'object') return d;
    const s = d;
    if (TYPES.includes(src.type)) s.type = src.type;
    if (src.seed != null) s.seed = /^\d+$/.test(String(src.seed)) ? num(src.seed, 0, 99999999, 2026, 1) : hashSeed(src.seed);
    s.size = SIZES.some((z) => z[0] === src.size) || src.size === 'custom' ? src.size : 'custom';
    s.w = num(src.w, 16, 8000, d.w, 1); s.h = num(src.h, 16, 8000, d.h, 1);
    if (src.size === undefined && src.w === undefined) s.size = 'hd';
    if (Array.isArray(src.colors)) {
      const c = src.colors.filter((x) => typeof x === 'string' && HEX.test(x)).slice(0, 8).map((x) => x.toLowerCase());
      if (c.length) s.colors = c;
    }
    if (FILLS.includes(src.fill)) s.fill = src.fill;
    s.angle = num(src.angle, 0, 360, d.angle, 1);
    s.stroke = src.stroke === true;
    if (HEX.test(src.strokeColor || '')) s.strokeColor = src.strokeColor.toLowerCase();
    s.strokeWidth = num(src.strokeWidth, 0.5, 40, d.strokeWidth, 0.5);
    s.bgOn = src.bgOn !== false;
    if (HEX.test(src.bg || '')) s.bg = src.bg.toLowerCase();
    s.rot = [0, 90, 180, 270].includes(Number(src.rot)) ? Number(src.rot) : 0;
    s.flipX = src.flipX === true; s.flipY = src.flipY === true;
    const sp = src.p && typeof src.p === 'object' ? src.p : {};
    for (const t of TYPES) {
      const q = sp[t] && typeof sp[t] === 'object' ? sp[t] : {};
      for (const def of PARAMS[t]) {
        const v = q[def.k];
        if (v === undefined) continue;
        if (def.opts) s.p[t][def.k] = def.opts.includes(v) ? v : def.def;
        else if (def.bool) s.p[t][def.k] = v === true;
        else s.p[t][def.k] = num(v, def.min, def.max, def.def, def.step);
      }
    }
    return s;
  }
  /** Randomises the current generator's parameters (and optionally the palette); seed kept when `keepSeed`. */
  function randomize(s, rand, keepSeed) {
    const o = JSON.parse(JSON.stringify(s));
    for (const d of PARAMS[o.type]) {
      if (d.opts) o.p[o.type][d.k] = d.opts[Math.floor(rand() * d.opts.length)];
      else if (d.bool) { if (!['showLines', 'smoothLines'].includes(d.k)) o.p[o.type][d.k] = rand() < 0.5; }
      else {
        // Stay inside a "pleasant" middle part of each range so random results are rarely empty or noisy.
        const lo = d.min + (d.max - d.min) * 0.05, hi = d.min + (d.max - d.min) * (['count', 'cells', 'lines', 'frequency', 'resolution'].includes(d.k) ? 0.55 : 0.85);
        let v = lo + rand() * (hi - lo);
        v = Math.round(v / d.step) * d.step;
        o.p[o.type][d.k] = +v.toFixed(4);
      }
    }
    if (o.type === 'scene' && o.p.scene.sizeMin > o.p.scene.sizeMax) [o.p.scene.sizeMin, o.p.scene.sizeMax] = [o.p.scene.sizeMax, o.p.scene.sizeMin];
    if (o.type === 'scene') o.p.scene.blur = rand() < 0.7 ? 0 : o.p.scene.blur;
    o.colors = randomPalette(rand);
    const light = rand() < 0.6;
    o.bg = light ? hslToHex(rand() * 360, 30 + rand() * 40, 93 + rand() * 4) : hslToHex(rand() * 360, 25 + rand() * 30, 8 + rand() * 7);
    o.fill = FILLS[Math.floor(rand() * 3)];
    o.angle = Math.round(rand() * 72) * 5;
    if (!keepSeed) o.seed = Math.floor(rand() * 100000000);
    return o;
  }

  /* ------------------------------------------------------------------ SVG helpers */
  /** Number → shortest string with at most `d` decimals ("-0" avoided). */
  function f(n, d = 1) {
    const m = 10 ** d, r = Math.round(n * m) / m;
    return (Object.is(r, -0) ? 0 : r).toString();
  }
  const pt = (p) => f(p[0]) + ' ' + f(p[1]);
  /** Closed Catmull-Rom spline through points → cubic Bézier path. k = tension (0 = polygon, 1 = classic). */
  function closedCurve(pts, k) {
    const n = pts.length;
    if (k <= 0.001) return 'M' + pts.map(pt).join('L') + 'Z';
    let d = 'M' + pt(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + pt([p1[0] + ((p2[0] - p0[0]) * k) / 6, p1[1] + ((p2[1] - p0[1]) * k) / 6]) + ' ' +
        pt([p2[0] - ((p3[0] - p1[0]) * k) / 6, p2[1] - ((p3[1] - p1[1]) * k) / 6]) + ' ' + pt(p2);
    }
    return d + 'Z';
  }
  /** Path commands (without the initial point) following an open edge, in a given style. */
  function edge(pts, style) {
    let d = '';
    const n = pts.length - 1;
    if (style === 'sharp') { for (let i = 1; i <= n; i++) d += 'L' + pt(pts[i]); return d; }
    if (style === 'step') {
      for (let i = 1; i <= n; i++) { const mx = (pts[i - 1][0] + pts[i][0]) / 2; d += 'H' + f(mx) + 'V' + f(pts[i][1]); }
      return d + 'H' + f(pts[n][0]);
    }
    for (let i = 0; i < n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d;
  }
  /** Points of a random smooth blob around (cx, cy). */
  function blobPoints(rand, cx, cy, r, n, contrast) {
    const pts = [], radii = [];
    for (let i = 0; i < n; i++) radii.push(1 - contrast * 0.85 * rand());
    const off = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + (rand() - 0.5) * (Math.PI / n) * contrast;
      pts.push([cx + Math.cos(a) * r * radii[i], cy + Math.sin(a) * r * radii[i]]);
    }
    return pts;
  }

  /** Collects <defs> (gradients, filters) and hands out short ids; only what is used ends up in the file. */
  class Defs {
    constructor() { this.items = []; this.keys = new Map(); }
    id() { return 'g' + this.items.length.toString(36); }
    linear(stops, angle) {
      const key = 'l' + angle + stops.join();
      if (this.keys.has(key)) return this.keys.get(key);
      const a = (angle * Math.PI) / 180, c = Math.cos(a) / 2, s = Math.sin(a) / 2, id = this.id();
      this.items.push(`<linearGradient id="${id}" x1="${f(0.5 - c, 3)}" y1="${f(0.5 - s, 3)}" x2="${f(0.5 + c, 3)}" y2="${f(0.5 + s, 3)}">${stopTags(stops)}</linearGradient>`);
      this.keys.set(key, id); return id;
    }
    radial(stops) {
      const key = 'r' + stops.join();
      if (this.keys.has(key)) return this.keys.get(key);
      const id = this.id();
      this.items.push(`<radialGradient id="${id}" cx=".5" cy=".5" r=".6">${stopTags(stops)}</radialGradient>`);
      this.keys.set(key, id); return id;
    }
    blur(std, w, h) {
      const id = this.id();
      this.items.push(`<filter id="${id}" x="${f(-w * 0.2)}" y="${f(-h * 0.2)}" width="${f(w * 1.4)}" height="${f(h * 1.4)}" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="${f(std)}"/></filter>`);
      return id;
    }
    toString() { return this.items.length ? '<defs>' + this.items.join('') + '</defs>' : ''; }
  }
  function stopTags(stops) {
    return stops.map((c, i) => `<stop offset="${f(stops.length > 1 ? i / (stops.length - 1) : 0, 3)}" stop-color="${c}"/>`).join('');
  }

  /** Context shared by the generators: size, random source, colour helpers. */
  function makeCtx(s, W, H) {
    const rand = rng(s.seed * 7 + TYPES.indexOf(s.type) * 1013904223);
    const defs = new Defs();
    const colors = s.colors;
    const strokeAttr = s.stroke ? ` stroke="${s.strokeColor}" stroke-width="${f(s.strokeWidth)}" stroke-linejoin="round"` : '';
    /** Fill for element j of n: palette ramp (solid) or a gradient spanning that element's slice of the palette. */
    function paint(j, n) {
      if (s.fill === 'none') return 'none';
      if (s.fill === 'solid') return ramp(colors, n > 1 ? j / (n - 1) : 0);
      const stops = n > 1 ? [ramp(colors, j / n), ramp(colors, (j + 1) / n)] : (colors.length > 1 ? colors : [colors[0], colors[0]]);
      return 'url(#' + (s.fill === 'linear' ? defs.linear(stops, s.angle) : defs.radial(stops)) + ')';
    }
    /** Fill for scattered items: a random palette colour (or a gradient starting at that colour). */
    function pick() {
      const i = Math.floor(rand() * colors.length);
      if (s.fill === 'none') return 'none';
      if (s.fill === 'solid' || colors.length < 2) return colors[i];
      const stops = [colors[i], colors[(i + 1) % colors.length]];
      return 'url(#' + (s.fill === 'linear' ? defs.linear(stops, s.angle) : defs.radial(stops)) + ')';
    }
    return { s, W, H, rand, defs, colors, strokeAttr, paint, pick, P: s.p[s.type], min: Math.min(W, H), max: Math.max(W, H) };
  }

  /* ------------------------------------------------------------------ generators */
  const GEN = {};

  /** (1) Blob: one smooth random closed shape, optionally repeated as concentric rings. */
  GEN.blob = (c) => {
    const { P, W, H, rand } = c;
    const r = (c.min / 2) * P.size, base = blobPoints(rand, W * P.cx, H * P.cy, r, P.complexity, P.contrast);
    let out = '';
    for (let j = 0; j < P.rings; j++) {
      const k = 1 - j / P.rings;
      const pts = base.map(([x, y]) => [W * P.cx + (x - W * P.cx) * k, H * P.cy + (y - H * P.cy) * k]);
      out += `<path d="${closedCurve(pts, P.smooth)}" fill="${c.paint(j, P.rings)}"${c.strokeAttr}/>`;
    }
    return out;
  };

  /** Edge points of a wave across the width, alternating crest / trough with some randomness. */
  function wavePoints(rand, W, y0, amp, freq, randomness) {
    const n = freq * 2, sign0 = rand() < 0.5 ? 1 : -1, pts = [];
    for (let i = 0; i <= n; i++) {
      const sign = (i % 2 ? 1 : -1) * sign0;
      pts.push([(W * i) / n, y0 + amp * (sign * (1 - randomness) + randomness * (rand() * 2 - 1))]);
    }
    return pts;
  }
  function waveShape(c, height, amp, freq, randomness, side, style) {
    const { W, H } = c, top = side === 'top';
    const y0 = top ? H * height : H - H * height;
    const pts = wavePoints(c.rand, W, y0, H * amp, freq, randomness);
    if (top) pts.forEach((p) => { p[1] = Math.max(p[1], -H * 0.5); });
    const edgeY = top ? 0 : H;
    return `M0 ${f(edgeY)}L${pt(pts[0])}${edge(pts, style)}L${f(W)} ${f(edgeY)}Z`;
  }
  /** (2) Wave: a single wavy edge filling the top or bottom of the canvas. */
  GEN.wave = (c) => {
    const P = c.P;
    return `<path d="${waveShape(c, P.height, P.amplitude, P.frequency, P.randomness, P.side, P.style)}" fill="${c.paint(0, 1)}"${c.strokeAttr}/>`;
  };
  /** (3) Layered waves: N stacked waves, back to front, with a colour ramp between the palette colours. */
  GEN.layers = (c) => {
    const P = c.P, n = P.count;
    let out = '';
    for (let k = 0; k < n; k++) {
      const h = (P.height * (n - k)) / n;
      const op = P.opacity < 1 ? ` fill-opacity="${f(P.opacity, 2)}"` : '';
      out += `<path d="${waveShape(c, h, P.amplitude, P.frequency, P.randomness, P.side, P.style)}" fill="${c.paint(k, n)}"${op}${c.strokeAttr}/>`;
    }
    return out;
  };

  /** Marching squares on a padded grid → closed loops (arrays of points) for one level. */
  function contourLoops(grid, gw, gh, cell, ox, oy, level) {
    const at = (i, j) => grid[j * gw + i];
    const pts = new Map(), adj = new Map();
    const hKey = (i, j) => (j * gw + i) * 2, vKey = (i, j) => (j * gw + i) * 2 + 1;
    const point = (key) => {
      if (pts.has(key)) return;
      const idx = key >> 1, i = idx % gw, j = (idx - i) / gw;
      const a = at(i, j), b = key & 1 ? at(i, j + 1) : at(i + 1, j), t = (level - a) / (b - a);
      pts.set(key, key & 1 ? [ox + i * cell, oy + (j + t) * cell] : [ox + (i + t) * cell, oy + j * cell]);
    };
    const link = (a, b) => {
      point(a); point(b);
      (adj.get(a) || adj.set(a, []).get(a)).push(b);
      (adj.get(b) || adj.set(b, []).get(b)).push(a);
    };
    for (let j = 0; j < gh - 1; j++) {
      for (let i = 0; i < gw - 1; i++) {
        const tl = at(i, j), tr = at(i + 1, j), br = at(i + 1, j + 1), bl = at(i, j + 1);
        const code = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const T = hKey(i, j), B = hKey(i, j + 1), L = vKey(i, j), R = vKey(i + 1, j);
        const centre = (tl + tr + br + bl) / 4 >= level;
        switch (code) {
          case 1: case 14: link(L, B); break;
          case 2: case 13: link(B, R); break;
          case 3: case 12: link(L, R); break;
          case 4: case 11: link(T, R); break;
          case 6: case 9: link(T, B); break;
          case 7: case 8: link(L, T); break;
          case 5: if (centre) { link(L, T); link(B, R); } else { link(T, R); link(L, B); } break;
          case 10: if (centre) { link(T, R); link(L, B); } else { link(L, T); link(B, R); } break;
        }
      }
    }
    // Walk the adjacency graph into loops. Every crossing has two neighbours because the grid border is "low".
    const loops = [], seen = new Set();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const loop = [];
      let prev = -1, cur = start;
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur); loop.push(pts.get(cur));
        const nb = adj.get(cur);
        const next = nb[0] !== prev && !seen.has(nb[0]) ? nb[0] : nb[1] !== undefined && !seen.has(nb[1]) ? nb[1] : undefined;
        prev = cur; cur = next;
      }
      if (loop.length >= 4) loops.push(loop);
    }
    return loops;
  }
  /** Closed loop → path, either straight segments or smoothed through segment midpoints (quadratic curves). */
  function loopPath(loop, smooth) {
    if (!smooth) return 'M' + loop.map(pt).join('L') + 'Z';
    const n = loop.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = 'M' + pt(mid(loop[n - 1], loop[0]));
    for (let i = 0; i < n; i++) d += 'Q' + pt(loop[i]) + ' ' + pt(mid(loop[i], loop[(i + 1) % n]));
    return d + 'Z';
  }
  /** (4) Topographic contour lines over seeded fractal noise, optionally with filled elevation bands. */
  GEN.topo = (c) => {
    const { P, W, H } = c;
    const noise = makeNoise(c.rand), cell = c.max / P.resolution;
    const gw = Math.ceil(W / cell) + 5, gh = Math.ceil(H / cell) + 5, ox = -2 * cell, oy = -2 * cell;
    const grid = new Float64Array(gw * gh);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        if (i === 0 || j === 0 || i === gw - 1 || j === gh - 1) continue;
        const v = fbm(noise, ((ox + i * cell) / c.max) * P.scale, ((oy + j * cell) / c.max) * P.scale, P.detail);
        grid[j * gw + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    const pad = lo - (hi - lo) - 1; // grid border sits below every level so all contours close
    for (let i = 0; i < gw; i++) { grid[i] = pad; grid[(gh - 1) * gw + i] = pad; }
    for (let j = 0; j < gh; j++) { grid[j * gw] = pad; grid[j * gw + gw - 1] = pad; }
    const n = P.lines;
    let bands = '', lines = '';
    if (P.bands) bands += `<rect width="${f(W)}" height="${f(H)}" fill="${ramp(c.colors, 0)}"/>`;
    for (let k = 0; k < n; k++) {
      const level = lo + ((k + 1) / (n + 1)) * (hi - lo);
      const loops = contourLoops(grid, gw, gh, cell, ox, oy, level);
      if (!loops.length) continue;
      const d = loops.map((l) => loopPath(l, P.smoothLines)).join('');
      if (P.bands) bands += `<path d="${d}" fill="${ramp(c.colors, (k + 1) / n)}" fill-rule="evenodd"/>`;
      if (P.showLines) {
        const col = P.lineColor === 'first' ? c.colors[0] : P.lineColor === 'last' ? c.colors[c.colors.length - 1] :
          P.lineColor === 'stroke' ? c.s.strokeColor : ramp(c.colors, n > 1 ? k / (n - 1) : 0);
        lines += `<path d="${d}" stroke="${col}"/>`;
      }
    }
    return bands + (lines ? `<g fill="none" stroke-width="${f(P.lineWidth, 2)}" stroke-linejoin="round">${lines}</g>` : '');
  };

  /** (5) Scene: scattered circles / blobs / rings / squares, optional no-overlap placement and soft blur. */
  GEN.scene = (c) => {
    const { P, W, H, rand } = c;
    const lo = Math.min(P.sizeMin, P.sizeMax), hi = Math.max(P.sizeMin, P.sizeMax);
    const placed = [];
    let tries = 0;
    while (placed.length < P.count && tries < P.count * 60) {
      tries++;
      const r = (c.min * (lo + (hi - lo) * rand() ** 1.6)) / 2;
      const x = rand() * W, y = rand() * H;
      if (!P.overlap && placed.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + c.min * 0.01)) continue;
      placed.push({ x, y, r });
    }
    placed.sort((a, b) => b.r - a.r); // big ones behind
    const kinds = ['circles', 'blobs', 'rings', 'squares'];
    const op = P.opacity < 1 ? ` opacity="${f(P.opacity, 2)}"` : '';
    let out = '';
    for (const q of placed) {
      const kind = P.shape === 'mixed' ? kinds[Math.floor(rand() * 4)] : P.shape;
      const fill = c.pick();
      if (kind === 'circles') out += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(q.r)}" fill="${fill}"${op}${c.strokeAttr}/>`;
      else if (kind === 'rings') {
        const col = fill === 'none' ? c.s.strokeColor : fill;
        out += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(q.r * 0.85)}" fill="none" stroke="${col}" stroke-width="${f(q.r * 0.3)}"${op}/>`;
      } else if (kind === 'squares') {
        const a = q.r * 1.5;
        out += `<rect x="${f(q.x - a / 2)}" y="${f(q.y - a / 2)}" width="${f(a)}" height="${f(a)}" rx="${f(a * 0.18)}" transform="rotate(${f(rand() * 90)} ${f(q.x)} ${f(q.y)})" fill="${fill}"${op}${c.strokeAttr}/>`;
      } else out += `<path d="${closedCurve(blobPoints(rand, q.x, q.y, q.r, 6, 0.45), 1)}" fill="${fill}"${op}${c.strokeAttr}/>`;
    }
    if (P.blur > 0 && out) out = `<g filter="url(#${c.defs.blur(P.blur * c.min * 0.06, W, H)})">${out}</g>`;
    return out;
  };

  /** (6) Low-poly: jittered grid of triangles coloured along a gradient direction with some random variance. */
  GEN.lowpoly = (c) => {
    const { P, W, H, rand } = c;
    const cols = P.cells, rows = Math.max(2, Math.round((cols * H) / W)), cw = W / cols, ch = H / rows;
    const g = [];
    for (let j = 0; j <= rows; j++) {
      g.push([]);
      for (let i = 0; i <= cols; i++) {
        const jx = i > 0 && i < cols ? (rand() - 0.5) * cw * 0.9 * P.jitter : 0;
        const jy = j > 0 && j < rows ? (rand() - 0.5) * ch * 0.9 * P.jitter : 0;
        g[j].push([i * cw + jx, j * ch + jy]);
      }
    }
    const a = (P.angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), span = Math.abs(W * ca) + Math.abs(H * sa);
    let out = '';
    const tri = (p, q, r) => {
      const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3;
      const t = ((cx - W / 2) * ca + (cy - H / 2) * sa) / span + 0.5 + (rand() - 0.5) * P.variance;
      const col = c.s.fill === 'none' ? 'none' : ramp(c.colors, t);
      const seam = c.s.stroke ? c.strokeAttr : col === 'none' ? '' : ` stroke="${col}" stroke-width="1" stroke-linejoin="round"`;
      out += `<path d="M${pt(p)}L${pt(q)}L${pt(r)}Z" fill="${col}"${seam}/>`;
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p00 = g[j][i], p10 = g[j][i + 1], p01 = g[j + 1][i], p11 = g[j + 1][i + 1];
        if (rand() < 0.5) { tri(p00, p10, p11); tri(p00, p11, p01); } else { tri(p00, p10, p01); tri(p10, p11, p01); }
      }
    }
    return out;
  };

  /** 1D midpoint displacement → ridge heights in [0, 1]. */
  function ridgeLine(rand, detail, rough) {
    const n = 2 ** detail, h = new Float64Array(n + 1);
    h[0] = rand(); h[n] = rand();
    let disp = 1;
    for (let step = n; step > 1; step /= 2) {
      for (let i = step / 2; i < n; i += step) h[i] = (h[i - step / 2] + h[i + step / 2]) / 2 + (rand() * 2 - 1) * disp;
      disp *= 0.35 + rough * 0.4;
    }
    let lo = Infinity, hi = -Infinity;
    for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return Array.from(h, (v) => (v - lo) / (hi - lo || 1));
  }
  /** (7) Peaks: layered mountain ridges (midpoint displacement), back ridges hazier, optional sun. */
  GEN.peaks = (c) => {
    const { P, W, H, rand } = c, n = P.count;
    let out = '';
    if (P.sun) {
      const sy = H * (1 - P.height) * 0.75 + H * 0.08, sr = c.min * 0.11;
      out += `<circle cx="${f(W * (0.2 + rand() * 0.6))}" cy="${f(sy)}" r="${f(sr)}" fill="${c.s.fill === 'none' ? 'none' : ramp(c.colors, 0)}"${c.strokeAttr}/>`;
    }
    for (let k = 0; k < n; k++) {
      const hs = ridgeLine(rand, P.detail, P.rugged);
      const top = H * (1 - P.height) + (k / n) * H * P.height * 0.75, amp = H * P.height * (0.55 - (0.3 * k) / n);
      const pts = hs.map((v, i) => [(W * i) / (hs.length - 1), top + (1 - v) * amp]);
      const op = P.haze && n > 1 ? ` fill-opacity="${f(0.55 + (0.45 * k) / (n - 1), 2)}"` : '';
      out += `<path d="M0 ${f(H)}L${pt(pts[0])}${edge(pts, 'sharp')}L${f(W)} ${f(H)}Z" fill="${c.paint(n > 1 ? k + (P.sun ? 1 : 0) : 0, n + (P.sun ? 1 : 0))}"${op}${c.strokeAttr}/>`;
    }
    return out;
  };

  /* ------------------------------------------------------------------ assembly */
  /** Builds the final SVG. Returns { svg, bytes, elements }. */
  function render(input) {
    const s = normalize(input);
    const W = s.w, H = s.h, swap = s.rot === 90 || s.rot === 270;
    const cw = swap ? H : W, ch = swap ? W : H; // generators draw in the rotated frame, then it is turned back
    const c = makeCtx(s, cw, ch);
    const body = GEN[s.type](c);
    const tf = [];
    if (s.flipX) tf.push(`matrix(-1 0 0 1 ${W} 0)`);
    if (s.flipY) tf.push(`matrix(1 0 0 -1 0 ${H})`);
    if (s.rot === 90) tf.push(`matrix(0 1 -1 0 ${W} 0)`);
    else if (s.rot === 180) tf.push(`matrix(-1 0 0 -1 ${W} ${H})`);
    else if (s.rot === 270) tf.push(`matrix(0 -1 1 0 0 ${H})`);
    const bg = s.bgOn ? `<rect width="${W}" height="${H}" fill="${s.bg}"/>` : '';
    const content = tf.length ? `<g transform="${tf.join(' ')}">${body}</g>` : body;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${c.defs}${bg}${content}</svg>`;
    return { svg, bytes: svg.length, elements: (svg.match(/<(path|circle|rect)\b/g) || []).length, settings: s };
  }

  /* ------------------------------------------------------------------ sharing */
  const b64e = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64d = (str) => {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  };
  /** Settings → URL hash ("#f1." + base64url JSON). Only the current generator's parameters are kept. */
  function encodeHash(s) {
    const o = Object.assign({}, s, { p: { [s.type]: s.p[s.type] } });
    return '#f1.' + b64e(JSON.stringify(o));
  }
  /** URL hash → normalised settings, or null if the hash is not one of ours. */
  function decodeHash(hash) {
    const m = /^#?f1\.([A-Za-z0-9_-]+)$/.exec(hash || '');
    if (!m) return null;
    try { return normalize(JSON.parse(b64d(m[1]))); } catch (e) { return null; }
  }
  /** CSS background snippet with the SVG as an URL-encoded data URI. */
  function cssSnippet(svg) {
    const data = svg.replace(/"/g, "'").replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);
    return `background-color: transparent;\nbackground-image: url("data:image/svg+xml,${data}");\nbackground-size: cover;\nbackground-position: center;\nbackground-repeat: no-repeat;`;
  }

  return { PARAMS, TYPES, FILLS, SIZES, PALETTES, defaults, normalize, randomize, render, ramp, randomPalette, rng, hashSeed,
    makeNoise, encodeHash, decodeHash, cssSnippet, contourLoops };
});
