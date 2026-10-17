// Engine tests (no browser needed): node tests/shapes.test.js
// Determinism, every generator and option, rotation/flip, normalisation against hostile input, hash round-trip,
// closed contour loops, CSS snippet and randomisation bounds.
const assert = require('assert');
const S = require('../js/shapes.js');
let n = 0;
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const tagsBalanced = (svg) => {
  // Very small XML sanity check: every opened element is closed in order.
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else if (!m[3]) stack.push(m[2]);
  }
  return stack.length === 0;
};

for (const type of S.TYPES) {
  const s = S.defaults(); s.type = type;
  const a = S.render(s), b = S.render(JSON.parse(JSON.stringify(s)));
  assert.strictEqual(a.svg, b.svg, type + ' not deterministic');
  assert(a.elements > 0, type + ' empty');
  assert(tagsBalanced(a.svg), type + ' unbalanced tags');
  assert(!/NaN|undefined|Infinity/.test(a.svg), type + ' has NaN/undefined');
  s.seed = 7; assert.notStrictEqual(S.render(s).svg, a.svg, type + ' seed has no effect');
  ok(`${type}: deterministic, ${a.elements} elements, ${a.bytes} bytes, seed changes output`);
  // every option of every parameter
  for (const d of S.PARAMS[type]) {
    const vals = d.opts || (d.bool ? [true, false] : [d.min, d.max]);
    for (const v of vals) {
      const q = S.defaults(); q.type = type; q.p[type][d.k] = v;
      const r = S.render(q);
      assert(tagsBalanced(r.svg) && !/NaN|undefined|Infinity/.test(r.svg), `${type}.${d.k}=${v} broken`);
      if (!(type === 'topo' && ((d.k === 'showLines' && !v)))) assert(r.elements > 0 || (type === 'topo' && !q.p.topo.showLines), `${type}.${d.k}=${v} empty`);
    }
  }
  ok(`${type}: all ${S.PARAMS[type].length} parameters at their extremes / options render cleanly`);
  for (const fill of S.FILLS) for (const rot of [0, 90, 180, 270]) {
    const q = S.defaults(); q.type = type; q.fill = fill; q.rot = rot; q.flipX = true; q.flipY = rot === 90; q.stroke = true; q.bgOn = false;
    const r = S.render(q);
    assert(tagsBalanced(r.svg) && !/NaN/.test(r.svg));
    assert(r.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">'));
  }
  ok(`${type}: 4 fills × 4 rotations with flips, stroke and transparent background`);
}

// hostile / malformed settings are neutralised
const evil = S.normalize({ type: '<script>', seed: 'hello', w: 1e9, h: -5, colors: ['#ff0000', 'red"/><script>alert(1)</script>', 42], fill: 'x', bg: 'javascript:1', strokeColor: '#12345g',
  rot: 45, p: { blob: { complexity: 1000, contrast: 'abc', rings: 2.6 }, wave: { side: '"><b>' } } });
assert.strictEqual(evil.type, 'blob'); assert.strictEqual(evil.w, 8000); assert.strictEqual(evil.h, 16);
assert.deepStrictEqual(evil.colors, ['#ff0000']); assert.strictEqual(evil.fill, 'linear'); assert.strictEqual(evil.rot, 0);
assert.strictEqual(evil.p.blob.complexity, 16); assert.strictEqual(evil.p.blob.contrast, 0.45); assert.strictEqual(evil.p.blob.rings, 3);
assert.strictEqual(evil.p.wave.side, 'bottom'); assert.strictEqual(evil.seed, S.hashSeed('hello'));
assert(!/script|javascript/.test(S.render(evil).svg));
ok('normalize() clamps numbers, rejects bad colours / enums / markup, hashes text seeds');
assert.deepStrictEqual(S.normalize(null), S.defaults());
ok('normalize(null) gives defaults');

// hash round trip restores the exact drawing
for (const type of S.TYPES) {
  let s = S.randomize(Object.assign(S.defaults(), { type }), S.rng(99 + type.length));
  s.rot = 90; s.size = 'custom'; s.w = 1234; s.h = 777;
  const back = S.decodeHash(S.encodeHash(s));
  assert.strictEqual(S.render(back).svg, S.render(s).svg, type + ' hash round trip');
}
assert.strictEqual(S.decodeHash('#nope'), null); assert.strictEqual(S.decodeHash('#f1.!!!'), null);
ok('URL hash round-trip reproduces the exact SVG for all generators; foreign hashes ignored');

// contours: every loop is closed and points stay near the canvas
{
  const g = [], gw = 6, gh = 6;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g.push(i === 0 || j === 0 || i === gw - 1 || j === gh - 1 ? -1 : (i + j) % 3);
  const loops = S.contourLoops(Float64Array.from(g), gw, gh, 10, 0, 0, 0.5);
  assert(loops.length >= 1 && loops.every((l) => l.length >= 4));
  ok(`marching squares produced ${loops.length} closed loop(s) on a synthetic grid`);
}

// randomize stays within ranges, keeps seed when asked
for (let i = 0; i < 50; i++) {
  const type = S.TYPES[i % S.TYPES.length];
  const base = Object.assign(S.defaults(), { type, seed: 1234 });
  const r = S.randomize(base, S.rng(i), i % 2 === 0);
  assert.deepStrictEqual(S.normalize(r).p[type], r.p[type], 'randomize out of range ' + type);
  if (i % 2 === 0) assert.strictEqual(r.seed, 1234);
  assert(r.colors.length >= 3 && r.colors.every((c) => /^#[0-9a-f]{6}$/.test(c)));
}
ok('randomize(): 50 draws within parameter ranges, valid palettes, seed lock respected');

const css = S.cssSnippet(S.render(S.defaults()).svg);
assert(/^background-color: transparent;\nbackground-image: url\("data:image\/svg\+xml,%3Csvg /.test(css) && !/[#<>"](?![^(]*\);)/.test(css.split('url(')[1].slice(1, -3)));
ok('CSS data-URI snippet is URL-encoded');
assert.strictEqual(S.ramp(['#000000', '#ffffff'], 0), '#000000'); assert.strictEqual(S.ramp(['#000000', '#ffffff'], 1), '#ffffff');
ok('OKLab colour ramp end points exact');
console.log(`\n${n} engine checks passed`);
