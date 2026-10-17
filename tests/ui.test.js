// Headless UI test (Playwright + Chrome/Chromium): node tests/ui.test.js
// Serves the folder locally and drives the interface at 1280 × 800 (desktop) and 390 × 844 (mobile):
// every generator and option renders, SVG export is valid XML (DOMParser, downloaded file), PNG export 1×/2×/4× with
// transparency, CSS / SVG / link copy, JSON export + import, URL hash restore in a fresh page, undo/redo, seed + lock,
// surprise, keyboard shortcuts, favourites (persisted), palette editing, canvas presets / rotation / flips,
// languages (+ Tifinagh, persisted), theme, no console errors, no horizontal overflow on mobile. Writes screenshots.
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.resolve(__dirname, '../../node_modules/playwright'))); }
const root = path.resolve(__dirname, '..'), shots = path.join(root, 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
let checks = 0;
const ok = (msg) => { checks++; console.log('  ✓ ' + msg); };
const pngSize = (buf) => ({ sig: buf.slice(1, 4).toString(), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

async function rendered(page, fn) {
  const n0 = await page.evaluate(() => +(document.body.dataset.renders || 0));
  await fn();
  await page.waitForFunction((n) => +(document.body.dataset.renders || 0) > n, n0);
}
async function stageInfo(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('#stage svg');
    const shapes = svg ? svg.querySelectorAll('path,circle,rect').length : 0;
    const box = document.getElementById('stage').getBoundingClientRect();
    return { shapes, w: box.width, h: box.height, svg: svg ? svg.outerHTML.length : 0 };
  });
}
const validXml = (page, text) => page.evaluate((t) => {
  const d = new DOMParser().parseFromString(t, 'image/svg+xml');
  return !d.querySelector('parsererror') && d.documentElement.nodeName === 'svg' && d.documentElement.getAttribute('xmlns') === 'http://www.w3.org/2000/svg';
}, text);

async function run(browser, base, viewport, label) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, locale: 'fr-FR' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(base);
  await page.waitForSelector('body[data-ready="1"]');
  assert.strictEqual(await page.getAttribute('html', 'lang'), 'fr');
  assert.strictEqual((await page.textContent('#newBtn')).trim(), '⟳ Nouvelle forme');
  ok('loads in French by default');

  // ---- every generator via the picker, plus every option of every parameter
  const types = await page.evaluate(() => SHAPES.TYPES);
  for (const type of types) {
    if (await page.evaluate(() => FA.state.s.type) === type) await page.click(`.gen input[value="${type}"]`, { force: true });
    else await rendered(page, () => page.click(`.gen input[value="${type}"]`, { force: true }));
    const info = await stageInfo(page);
    assert(info.shapes > 0 && info.w > 50 && info.h > 30, type + ' did not render');
    assert(await validXml(page, await page.evaluate(() => FA.getSVG())), type + ' invalid SVG');
    const params = await page.evaluate((t) => SHAPES.PARAMS[t], type);
    for (const d of params) {
      if (d.opts) for (const o of [...d.opts.filter((x) => x !== d.def), d.def]) await rendered(page, () => page.click(`#p-${d.k} input[value="${o}"]`, { force: true }));
      else if (d.bool) { await rendered(page, () => page.click(`#p-${d.k}`)); await rendered(page, () => page.click(`#p-${d.k}`)); }
      else for (const v of [d.max, d.min, d.def]) await rendered(page, () => page.$eval(`#p-${d.k}`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v));
      assert((await stageInfo(page)).shapes > 0 || type === 'topo', `${type}.${d.k} emptied the stage`);
    }
    ok(`${type}: renders (${info.shapes} shapes), valid SVG, all ${params.length} controls exercised`);
  }
  // topo bands on
  await rendered(page, () => page.click('.gen input[value="topo"]', { force: true }));
  await rendered(page, () => page.click('#p-bands'));
  assert((await page.evaluate(() => FA.getSVG())).includes('fill-rule="evenodd"'));
  ok('topography colour bands render');

  // ---- fills, stroke, background, palette
  await rendered(page, () => page.click('.gen input[value="blob"]', { force: true }));
  for (const f of ['solid', 'radial', 'none', 'linear']) {
    await rendered(page, () => page.click(`#fillSeg input[value="${f}"]`, { force: true }));
    const svg = await page.evaluate(() => FA.getSVG());
    assert(f === 'radial' ? svg.includes('radialGradient') : f === 'linear' ? svg.includes('linearGradient') : !svg.includes('Gradient'));
    assert.strictEqual(await page.isVisible('#warn'), f === 'none');
    assert.strictEqual(await page.isVisible('#angleField'), f === 'linear');
  }
  await rendered(page, () => page.click('#strokeOn'));
  assert((await page.evaluate(() => FA.getSVG())).includes('stroke-width="4"'));
  await rendered(page, () => page.click('#strokeOn'));
  const nCol = await page.locator('#swatches input[type=color]').count();
  await rendered(page, () => page.click('#swatches .addsw'));
  assert.strictEqual(await page.locator('#swatches input[type=color]').count(), nCol + 1);
  await rendered(page, () => page.locator('#swatches .sw button').first().click());
  await rendered(page, () => page.$eval('#swatches input[type=color]', (el) => { el.value = '#123456'; el.dispatchEvent(new Event('input', { bubbles: true })); }));
  assert.strictEqual(await page.evaluate(() => FA.state.s.colors[0]), '#123456');
  await rendered(page, () => page.selectOption('#palPreset', 'lagon'));
  assert.deepStrictEqual(await page.evaluate(() => FA.state.s.colors), ['#c6f7e2', '#2ec4b6', '#0b6e8a']);
  await rendered(page, () => page.click('#palReverse'));
  assert.strictEqual(await page.evaluate(() => FA.state.s.colors[0]), '#0b6e8a');
  await rendered(page, () => page.click('#palRandom'));
  ok('fills (solid / linear / radial / none + warning), stroke, palette add / remove / edit / preset / reverse / random');

  // ---- canvas: presets, custom, swap, rotation, flips
  await rendered(page, () => page.selectOption('#sizePreset', 'story'));
  let st = await stageInfo(page);
  assert(st.h > st.w * 1.7, 'story ratio');
  await rendered(page, () => page.fill('#w', '1000').then(() => page.press('#w', 'Enter')));
  assert.strictEqual(await page.inputValue('#sizePreset'), 'custom');
  await rendered(page, () => page.click('#swapBtn'));
  assert.deepStrictEqual(await page.evaluate(() => [FA.state.s.w, FA.state.s.h]), [1920, 1000]);
  await rendered(page, () => page.selectOption('#sizePreset', 'hd'));
  await rendered(page, () => page.click('#rotSeg input[value="90"]', { force: true }));
  assert((await page.evaluate(() => FA.getSVG())).includes('matrix(0 1 -1 0 1920 0)'));
  await rendered(page, () => page.click('#flipX'));
  assert((await page.evaluate(() => FA.getSVG())).includes('matrix(-1 0 0 1 1920 0)'));
  await rendered(page, () => page.click('#flipX'));
  await rendered(page, () => page.click('#rotSeg input[value="0"]', { force: true }));
  ok('canvas presets (story ratio), custom size, swap, rotation 90°, mirror');

  // ---- seed, lock, new shape, surprise, keyboard, undo/redo
  await rendered(page, () => page.fill('#seed', '424242').then(() => page.press('#seed', 'Enter')));
  const svg424 = await page.evaluate(() => FA.getSVG());
  await page.waitForTimeout(450);
  await rendered(page, () => page.click('#newBtn'));
  assert.notStrictEqual(await page.evaluate(() => FA.getSVG()), svg424);
  await page.waitForTimeout(450);
  await rendered(page, () => page.click('#undoBtn'));
  assert.strictEqual(await page.evaluate(() => FA.getSVG()), svg424, 'undo restores');
  await rendered(page, () => page.click('#redoBtn'));
  assert.notStrictEqual(await page.evaluate(() => FA.getSVG()), svg424);
  await rendered(page, () => page.click('#undoBtn'));
  await page.click('#lockBtn');
  assert(await page.isDisabled('#newBtn'));
  await rendered(page, () => page.click('#surpriseBtn'));
  assert.strictEqual(await page.evaluate(() => FA.state.s.seed), 424242, 'lock keeps seed');
  await page.click('#lockBtn');
  await page.focus('#stage');
  await rendered(page, () => page.keyboard.press('n'));
  assert.notStrictEqual(await page.evaluate(() => FA.state.s.seed), 424242);
  await rendered(page, () => page.keyboard.press('3'));
  assert.strictEqual(await page.evaluate(() => FA.state.s.type), 'layers');
  await page.waitForTimeout(450);
  await rendered(page, () => page.keyboard.press('Control+z'));
  assert.notStrictEqual(await page.evaluate(() => FA.state.s.type), 'layers');
  await rendered(page, () => page.keyboard.press('Control+y'));
  assert.strictEqual(await page.evaluate(() => FA.state.s.type), 'layers');
  await rendered(page, () => page.keyboard.press('s'));
  ok('seed field, new shape, undo / redo (buttons + Ctrl+Z / Ctrl+Y), seed lock with surprise, keys N / 1–7 / S');

  // ---- exports
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlSvg')]);
  const svgFile = fs.readFileSync(await dl.path(), 'utf8');
  assert(dl.suggestedFilename().endsWith('.svg') && await validXml(page, svgFile));
  assert.strictEqual(svgFile, await page.evaluate(() => FA.getSVG()));
  ok(`SVG download is valid XML (${dl.suggestedFilename()}, ${svgFile.length} bytes)`);
  for (const k of [1, 2, 4]) {
    await page.click(`#scaleSeg input[value="${k}"]`, { force: true });
    [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#dlPng')]);
    const p = pngSize(fs.readFileSync(await dl.path()));
    assert.deepStrictEqual(p, { sig: 'PNG', w: 1920 * k, h: 1080 * k }, 'png ' + k);
  }
  ok('PNG download at 1× / 2× / 4× (1920×1080 → 7680×4320) with correct dimensions');
  await rendered(page, () => page.click('#bgOn'));
  const alpha = await page.evaluate(async () => {
    const { blob } = await FA.pngBlob(1);
    const bmp = await createImageBitmap(blob), c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d');
    x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
    let transparent = 0, opaque = 0;
    for (let i = 3; i < d.length; i += 4 * 97) { if (d[i] === 0) transparent++; else opaque++; }
    return { transparent, opaque };
  });
  assert(alpha.transparent > 0 && alpha.opaque > 0, 'transparency ' + JSON.stringify(alpha));
  await rendered(page, () => page.click('#bgOn'));
  ok(`PNG keeps transparency when the background is off (${alpha.transparent} transparent / ${alpha.opaque} painted samples)`);
  await page.click('#copySvg');
  assert.strictEqual(await page.evaluate(() => navigator.clipboard.readText()), await page.evaluate(() => FA.getSVG()));
  await page.click('#copyCss');
  const css = await page.evaluate(() => navigator.clipboard.readText());
  assert(css.startsWith('background-color: transparent;\nbackground-image: url("data:image/svg+xml,%3Csvg'));
  const cssOk = await page.evaluate((css) => new Promise((res) => {
    const url = css.match(/url\("(.*)"\)/)[1], img = new Image();
    img.onload = () => res(img.naturalWidth > 0); img.onerror = () => res(false); img.src = url;
  }), css);
  assert(cssOk, 'css data uri does not load');
  ok('copy SVG code and CSS data-URI (the data-URI loads as an image)');

  // JSON export → change → import
  const before = await page.evaluate(() => FA.getSVG());
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlJson')]);
  const jsonPath = await dl.path();
  JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  await rendered(page, () => page.click('.gen input[value="peaks"]', { force: true }));
  await rendered(page, () => page.setInputFiles('#importJson', { name: 'r.json', mimeType: 'application/json', buffer: fs.readFileSync(jsonPath) }));
  assert.strictEqual(await page.evaluate(() => FA.getSVG()), before);
  await page.setInputFiles('#importJson', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{oops') });
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('JSON'));
  ok('JSON settings export + import restores the shape; broken JSON reports an error');

  // ---- share link restores the exact shape in a fresh page
  await rendered(page, () => page.click('.gen input[value="topo"]', { force: true }));
  await rendered(page, () => page.fill('#seed', '9081').then(() => page.press('#seed', 'Enter')));
  await page.click('#copyLink');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await page.waitForFunction((l) => location.href === l, link); // the address bar follows the shape
  const want = await page.evaluate(() => FA.getSVG());
  const p2 = await ctx.newPage();
  await p2.evaluate(() => 0);
  await p2.goto(base);
  await p2.waitForSelector('body[data-ready="1"]');
  await p2.evaluate(() => localStorage.clear());
  await p2.goto(link);
  await p2.reload();
  await p2.waitForSelector('body[data-ready="1"]');
  assert.strictEqual(await p2.evaluate(() => FA.getSVG()), want, 'hash restore');
  assert.strictEqual(await p2.inputValue('#seed'), '9081');
  // hashchange on an open page
  await page.evaluate(() => FA.setType('wave'));
  await page.waitForTimeout(400);
  await rendered(page, () => page.evaluate((h) => { location.hash = h; }, new URL(link).hash));
  assert.strictEqual(await page.evaluate(() => FA.getSVG()), want);
  await p2.close();
  ok('share link / URL hash restores the exact SVG (fresh page + hashchange)');

  // ---- favourites (persist across reload)
  await page.click('#saveFav');
  await page.click('#favBtn');
  assert.strictEqual(await page.locator('#favs li').count(), 2);
  await page.reload(); await page.waitForSelector('body[data-ready="1"]');
  assert.strictEqual(await page.locator('#favs li').count(), 2);
  await rendered(page, () => page.click('.gen input[value="scene"]', { force: true }));
  await rendered(page, () => page.locator('#favs .open').first().click());
  assert.strictEqual(await page.evaluate(() => FA.getSVG()), want);
  await page.locator('#favs .del').first().click();
  assert.strictEqual(await page.locator('#favs li').count(), 1);
  ok('favourites: save (button + ★), persist after reload, open, delete');

  // ---- languages, Tifinagh, theme
  await page.selectOption('#lang', 'en');
  assert.strictEqual((await page.textContent('#newBtn')).trim(), '⟳ New shape');
  assert.strictEqual(await page.getAttribute('html', 'lang'), 'en');
  assert(await page.isHidden('#tfngWrap'));
  await page.selectOption('#lang', 'kab');
  assert.strictEqual((await page.textContent('#newBtn')).trim(), '⟳ Talɣa tamaynut');
  assert(await page.isVisible('#tfngWrap'));
  await page.check('#tfng');
  assert(/[\u2D30-\u2D7F]/.test(await page.textContent('#newBtn')));
  assert.strictEqual(await page.getAttribute('html', 'lang'), 'kab-Tfng');
  const missing = await page.evaluate(() => [...document.querySelectorAll('[data-i18n]')].filter((e) => !e.textContent.trim() || e.textContent === e.dataset.i18n).map((e) => e.dataset.i18n));
  assert.deepStrictEqual(missing, []);
  await page.reload(); await page.waitForSelector('body[data-ready="1"]');
  assert.strictEqual(await page.inputValue('#lang'), 'kab');
  assert(/[\u2D30-\u2D7F]/.test(await page.textContent('#newBtn')));
  await page.uncheck('#tfng');
  await page.selectOption('#lang', 'fr');
  ok('language switching FR → EN → Taqbaylit → Tifinagh, all labels translated, choice persisted after reload');
  const th0 = await page.getAttribute('html', 'data-theme');
  await page.click('#themeBtn');
  const th1 = await page.getAttribute('html', 'data-theme');
  assert.notStrictEqual(th0, th1);
  await page.reload(); await page.waitForSelector('body[data-ready="1"]');
  assert.strictEqual(await page.getAttribute('html', 'data-theme'), th1);
  await page.click('#themeBtn');
  ok('light / dark theme toggle, persisted');
  await page.click('#helpBtn');
  assert(await page.isVisible('#helpDlg'));
  await page.keyboard.press('Escape');
  assert(!(await page.isVisible('#helpDlg')));
  ok('help dialog opens / closes with Escape');

  // accessibility basics: every form control has an accessible name
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('input,select,button,textarea')].filter((el) => {
    if (el.closest('[hidden]') || el.type === 'file') return false;
    const lbl = el.labels && el.labels.length ? [...el.labels].map((l) => l.textContent).join('').trim() : '';
    return !(lbl || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.title);
  }).map((el) => el.id || el.outerHTML.slice(0, 60)));
  assert.deepStrictEqual(unnamed, []);
  ok('every control has an accessible name');

  if (label === 'mobile') {
    const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert(o[0] <= o[1], 'horizontal overflow on mobile ' + o); ok('no horizontal overflow at 390 px');
  }
  assert.deepStrictEqual(errors, [], 'console errors');
  ok('no console errors or warnings');
  await ctx.close();
}

/** Nice-looking states for the README screenshots. */
async function screenshots(browser, base) {
  const shot = async (viewport, theme, setup, file) => {
    const ctx = await browser.newContext({ viewport, locale: 'fr-FR', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base); await page.waitForSelector('body[data-ready="1"]');
    await page.evaluate((th) => { localStorage.setItem('forme-atelier:theme', th); localStorage.setItem('forme-atelier:lang', '"fr"'); }, theme);
    await page.reload(); await page.waitForSelector('body[data-ready="1"]');
    await page.evaluate(setup);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, file) });
    await ctx.close();
  };
  await shot({ width: 1280, height: 800 }, 'light', () => {
    const s = SHAPES.defaults(); s.type = 'layers'; s.seed = 31; s.colors = ['#f9dc5c', '#f18f01', '#a23b72', '#2b1b54']; s.fill = 'solid'; s.bg = '#fff6ec';
    s.p.layers.count = 6; s.p.layers.height = 0.75; FA.load(s);
  }, 'desktop.png');
  await shot({ width: 1280, height: 800 }, 'dark', () => {
    const s = SHAPES.defaults(); s.type = 'topo'; s.seed = 1871; s.colors = ['#0f1b4c', '#3d348b', '#e85d75', '#f9dc5c']; s.bg = '#0f1b4c';
    s.p.topo.bands = true; s.p.topo.lines = 12; s.p.topo.lineColor = 'stroke'; s.strokeColor = '#ffffff'; s.p.topo.lineWidth = 1.25; FA.load(s);
  }, 'desktop-dark.png');
  await shot({ width: 390, height: 844 }, 'light', () => {
    const s = SHAPES.defaults(); s.type = 'scene'; s.seed = 77; s.size = 'story'; s.w = 1080; s.h = 1920; s.colors = ['#1f6fb2', '#3aa655', '#f2c230', '#d7263d'];
    s.fill = 'solid'; s.bg = '#fdf8ef'; s.p.scene.shape = 'mixed'; s.p.scene.count = 30; FA.load(s);
  }, 'mobile.png');
  ok('README screenshots written (desktop.png, desktop-dark.png, mobile.png)');
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const exe = ['/usr/bin/google-chrome', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
  let code = 0;
  try {
    fs.mkdirSync(shots, { recursive: true });
    console.log('desktop 1280 × 800');
    await run(browser, base, { width: 1280, height: 800 }, 'desktop');
    console.log('mobile 390 × 844');
    await run(browser, base, { width: 390, height: 844, isMobile: true, hasTouch: true }, 'mobile');
    console.log('screenshots');
    await screenshots(browser, base);
    console.log(`\n${checks} UI checks passed`);
  } catch (e) { console.error('\n✗ ' + (e.stack || e)); code = 1; }
  await browser.close(); server.close(); process.exit(code);
})();
