/* app.js — Forme Atelier user interface: controls, preview, history, favourites, exports, sharing and languages.
 * Relies on SHAPES (js/shapes.js) for the drawing and I18N (js/i18n.js) for the texts. Original code, MIT licence. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'forme-atelier:';
  const store = {
    get(k, def) { try { const v = localStorage.getItem(KEY + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* private mode / quota: ignore */ } },
  };

  /* ------------------------------------------------------------------ state */
  const state = {
    s: SHAPES.defaults(),
    lang: store.get('lang', null) || ((navigator.language || 'fr').startsWith('en') ? 'en' : 'fr'),
    tfng: store.get('tfng', false),
    locked: store.get('lock', false),
    scale: store.get('scale', 2),
    favs: store.get('favs', []),
    hist: [], hi: -1, // undo history (JSON strings) and current index
    last: null, // last render result
  };
  if (!I18N.LANGS.includes(state.lang)) state.lang = 'fr';
  if (![1, 2, 4].includes(state.scale)) state.scale = 2;
  if (!Array.isArray(state.favs)) state.favs = [];
  const t = (key, vars) => I18N.t(key, state.lang, vars, state.tfng);
  const P = () => state.s.p[state.s.type];

  /* ------------------------------------------------------------------ small helpers */
  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  /** Copies text; falls back to showing it selected in the code box. Resolves true when the clipboard worked. */
  async function copyText(text) {
    const box = $('code');
    $('codeWrap').hidden = false; box.value = text;
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      box.focus(); box.select();
      try { return document.execCommand('copy'); } catch (e2) { return false; }
    }
  }
  const fileBase = () => `forme-atelier-${state.s.type}-${state.s.seed}`;
  const fmtNum = (v, d) => Number(v).toLocaleString(state.lang === 'en' ? 'en' : 'fr', { maximumFractionDigits: d });
  function fmtParam(def, v) {
    if (def.pct) return Math.round(v * 100) + ' %';
    if (def.deg) return v + '°';
    return fmtNum(v, def.step >= 1 ? 0 : 2);
  }
  /** Builds a segmented radio group. */
  function seg(container, name, values, label, current, onChange) {
    container.innerHTML = '';
    for (const v of values) {
      const l = document.createElement('label');
      const i = document.createElement('input');
      i.type = 'radio'; i.name = name; i.value = String(v); i.checked = String(v) === String(current);
      i.addEventListener('change', () => { if (i.checked) onChange(v); });
      const sp = document.createElement('span'); sp.textContent = label(v);
      l.append(i, sp); container.appendChild(l);
    }
  }

  /* ------------------------------------------------------------------ generator picker */
  const ICONS = {
    blob: '<path d="M10 3C16 0 26 2 28 9S25 22 17 21 4 18 4 12 5 5 10 3Z" fill="currentColor"/>',
    wave: '<path d="M0 13C6 7 11 7 17 13S28 19 34 13V24H0Z" fill="currentColor"/>',
    layers: '<path d="M0 8C7 3 12 4 17 8S28 12 34 7V24H0Z" fill="currentColor" opacity=".3"/><path d="M0 13C6 9 12 9 17 13S28 16 34 12V24H0Z" fill="currentColor" opacity=".6"/><path d="M0 18C7 14 12 15 18 18S28 20 34 17V24H0Z" fill="currentColor"/>',
    topo: '<g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 3C26 3 31 8 30 13S23 21 16 21 3 17 4 11 9 3 17 3Z"/><path d="M17 7C23 7 25 10 24 13S20 17 16 17 9 15 10 11 12 7 17 7Z"/><path d="M17 11C19 11 20 12 19 13S17 14 16 14 14 13 15 12 16 11 17 11Z"/></g>',
    scene: '<g fill="currentColor"><circle cx="9" cy="10" r="7"/><circle cx="24" cy="15" r="6" opacity=".6"/><circle cx="27" cy="5" r="3" opacity=".8"/><circle cx="14" cy="20" r="3" opacity=".45"/></g>',
    lowpoly: '<g fill="currentColor"><path d="M0 0H14L5 12Z" opacity=".35"/><path d="M14 0L5 12L19 13Z" opacity=".6"/><path d="M14 0H34L19 13Z" opacity=".45"/><path d="M0 0V24L5 12Z" opacity=".75"/><path d="M5 12L0 24H17Z" opacity=".9"/><path d="M5 12L19 13L17 24Z"/><path d="M19 13L34 0V24Z" opacity=".7"/><path d="M19 13L17 24H34Z" opacity=".85"/></g>',
    peaks: '<circle cx="25" cy="7" r="4" fill="currentColor" opacity=".45"/><path d="M0 24L8 10L12 15L19 5L26 15L30 11L34 16V24Z" fill="currentColor"/>',
  };
  function buildGens() {
    const box = $('gens');
    box.querySelectorAll('.gen').forEach((n) => n.remove());
    SHAPES.TYPES.forEach((type, i) => {
      const l = document.createElement('label'); l.className = 'gen';
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'gen'; inp.value = type; inp.checked = state.s.type === type;
      inp.setAttribute('aria-keyshortcuts', String(i + 1));
      inp.addEventListener('change', () => { if (inp.checked) setType(type); });
      const sp = document.createElement('span');
      sp.innerHTML = `<svg viewBox="0 0 34 24" aria-hidden="true">${ICONS[type]}</svg>`;
      const tx = document.createElement('b'); tx.style.fontWeight = 'inherit'; tx.dataset.i18n = 'g_' + type; tx.textContent = t('g_' + type);
      sp.appendChild(tx); l.append(inp, sp); box.appendChild(l);
    });
  }
  function setType(type) {
    if (state.s.type === type) return;
    state.s.type = type;
    document.querySelectorAll('input[name=gen]').forEach((i) => { i.checked = i.value === type; });
    buildParams(); update();
  }

  /* ------------------------------------------------------------------ generator parameters (built from SHAPES.PARAMS) */
  function paramLabel(k) {
    const special = 'p_' + state.s.type + '_' + k;
    return I18N.has(special) ? t(special) : t('p_' + k);
  }
  function buildParams() {
    const box = $('params');
    box.innerHTML = '';
    const type = state.s.type;
    for (const def of SHAPES.PARAMS[type]) {
      const id = 'p-' + def.k, v = P()[def.k];
      if (def.bool) {
        const l = document.createElement('label'); l.className = 'check';
        const i = document.createElement('input'); i.type = 'checkbox'; i.id = id; i.checked = v;
        i.addEventListener('change', () => { P()[def.k] = i.checked; update(); });
        const sp = document.createElement('span'); sp.textContent = paramLabel(def.k);
        l.append(i, sp); box.appendChild(l);
      } else if (def.opts) {
        const f = document.createElement('div'); f.className = 'field';
        const lb = document.createElement('span'); lb.className = 'lbl'; lb.id = id + '-l'; lb.textContent = paramLabel(def.k);
        const g = document.createElement('div'); g.className = 'seg wide'; g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-labelledby', lb.id); g.id = id;
        seg(g, id, def.opts, (o) => t('o_' + o), v, (o) => { P()[def.k] = o; update(); });
        f.append(lb, g); box.appendChild(f);
      } else {
        const f = document.createElement('div'); f.className = 'field';
        const lb = document.createElement('label'); lb.htmlFor = id;
        const name = document.createElement('span'); name.textContent = paramLabel(def.k);
        const out = document.createElement('output'); out.htmlFor = id; out.textContent = fmtParam(def, v);
        lb.append(name, out);
        const r = document.createElement('input');
        Object.assign(r, { type: 'range', id, min: def.min, max: def.max, step: def.step, value: v });
        r.addEventListener('input', () => { P()[def.k] = Number(r.value); out.textContent = fmtParam(def, Number(r.value)); update(); });
        f.append(lb, r); box.appendChild(f);
      }
    }
  }

  /* ------------------------------------------------------------------ colours */
  function buildSwatches() {
    const box = $('swatches');
    box.innerHTML = '';
    const cols = state.s.colors;
    cols.forEach((c, i) => {
      const w = document.createElement('span'); w.className = 'sw';
      const inp = document.createElement('input'); inp.type = 'color'; inp.value = c;
      inp.setAttribute('aria-label', t('colorN', { n: i + 1 })); inp.title = c;
      inp.addEventListener('input', () => { state.s.colors[i] = inp.value.toLowerCase(); inp.title = inp.value; update(); });
      const del = document.createElement('button'); del.type = 'button'; del.textContent = '✕';
      del.setAttribute('aria-label', t('removeColor', { n: i + 1 })); del.title = del.getAttribute('aria-label');
      del.disabled = cols.length <= 2;
      del.addEventListener('click', () => { state.s.colors.splice(i, 1); buildSwatches(); update(); });
      w.append(inp, del); box.appendChild(w);
    });
    if (cols.length < 8) {
      const add = document.createElement('button'); add.type = 'button'; add.className = 'btn icon addsw'; add.textContent = '+';
      add.setAttribute('aria-label', t('addColor')); add.title = t('addColor');
      add.addEventListener('click', () => {
        const c = state.s.colors;
        c.push(c.length > 1 ? SHAPES.ramp([c[c.length - 1], c[0]], 0.5) : '#888888');
        buildSwatches(); update();
        box.querySelectorAll('input[type=color]')[c.length - 1].focus();
      });
      box.appendChild(add);
    }
  }
  function buildPalettePresets() {
    const sel = $('palPreset');
    sel.innerHTML = '';
    const o0 = document.createElement('option'); o0.value = ''; o0.textContent = t('presetPalette') + ' ' + t('choose'); sel.appendChild(o0);
    for (const name of Object.keys(SHAPES.PALETTES)) {
      const o = document.createElement('option'); o.value = name; o.textContent = t('pal_' + name); sel.appendChild(o);
    }
  }

  /* ------------------------------------------------------------------ canvas size */
  function buildSizes() {
    const sel = $('sizePreset');
    sel.innerHTML = '';
    for (const [id, w, h] of SHAPES.SIZES) {
      const o = document.createElement('option'); o.value = id; o.textContent = `${t('sz_' + id)} — ${w} × ${h}`; sel.appendChild(o);
    }
    const o = document.createElement('option'); o.value = 'custom'; o.textContent = t('sz_custom'); sel.appendChild(o);
    sel.value = state.s.size;
  }
  /** After a manual width/height change, select the matching preset (or "custom"). */
  function matchSize() {
    const m = SHAPES.SIZES.find(([, w, h]) => w === state.s.w && h === state.s.h);
    state.s.size = m ? m[0] : 'custom';
    $('sizePreset').value = state.s.size;
  }

  /* ------------------------------------------------------------------ sync every control from the settings */
  function syncControls() {
    const s = state.s;
    document.querySelectorAll('input[name=gen]').forEach((i) => { i.checked = i.value === s.type; });
    buildParams(); buildSwatches();
    $('seed').value = s.seed;
    seg($('fillSeg'), 'fill', SHAPES.FILLS, (f) => t('f_' + f), s.fill, (f) => { state.s.fill = f; update(); });
    $('angle').value = s.angle; $('angleOut').textContent = s.angle + '°';
    $('strokeOn').checked = s.stroke; $('strokeColor').value = s.strokeColor;
    $('strokeWidth').value = s.strokeWidth; $('strokeWidthOut').textContent = fmtNum(s.strokeWidth, 1) + ' px';
    $('bgOn').checked = s.bgOn; $('bg').value = s.bg;
    $('sizePreset').value = s.size; $('w').value = s.w; $('h').value = s.h;
    seg($('rotSeg'), 'rot', [0, 90, 180, 270], (r) => r + '°', s.rot, (r) => { state.s.rot = r; update(); });
    $('flipX').checked = s.flipX; $('flipY').checked = s.flipY;
    seg($('scaleSeg'), 'scale', [1, 2, 4], (k) => k + '×', state.scale, (k) => { state.scale = k; store.set('scale', k); pngInfo(); });
    lockUi();
  }
  function lockUi() {
    $('lockBtn').setAttribute('aria-pressed', String(state.locked));
    $('lockBtn').firstElementChild.textContent = state.locked ? '🔒' : '🔓';
    $('newBtn').disabled = state.locked;
  }
  function pngInfo() { $('pngInfo').textContent = t('pngInfo', { w: state.s.w * state.scale, h: state.s.h * state.scale }); }

  /* ------------------------------------------------------------------ rendering */
  let raf = 0, histTimer = 0, hashTimer = 0;
  /** Schedules a redraw (coalesced to one per frame) and the history / URL / autosave updates. */
  function update(opts = {}) {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); });
    clearTimeout(hashTimer); hashTimer = setTimeout(saveUrl, 250);
    if (!opts.noHistory) { clearTimeout(histTimer); histTimer = setTimeout(commit, 400); }
  }
  function draw() {
    const r = SHAPES.render(state.s);
    state.last = r;
    $('stage').innerHTML = r.svg;
    // The preview box is rounded to whole pixels; let the SVG fill it exactly (the export keeps the true ratio).
    $('stage').firstElementChild.setAttribute('preserveAspectRatio', 'none');
    fitStage();
    $('stats').textContent = t('stats', { w: state.s.w, h: state.s.h, kb: fmtNum(r.bytes / 1024, 1), n: r.elements });
    $('angleField').hidden = state.s.fill !== 'linear';
    $('strokeRow').hidden = !state.s.stroke;
    $('warn').hidden = !(state.s.fill === 'none' && !state.s.stroke && state.s.type !== 'topo');
    $('genDesc').textContent = t('gd_' + state.s.type);
    pngInfo();
    document.body.dataset.renders = String(+(document.body.dataset.renders || 0) + 1);
  }
  /** Scales the preview box to fit the available area while keeping the canvas ratio. */
  function fitStage() {
    const wrap = $('stagewrap'), st = $('stage'), cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = Math.min(aw / state.s.w, ah / state.s.h);
    st.style.width = Math.max(10, Math.floor(state.s.w * k)) + 'px';
    st.style.height = Math.max(10, Math.floor(state.s.h * k)) + 'px';
  }
  function saveUrl() {
    const h = SHAPES.encodeHash(state.s);
    if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    store.set('last', state.s);
  }

  /* ------------------------------------------------------------------ undo / redo */
  function commit() {
    const j = JSON.stringify(state.s);
    if (state.hist[state.hi] === j) return;
    state.hist = state.hist.slice(0, state.hi + 1);
    state.hist.push(j);
    if (state.hist.length > 80) state.hist.shift();
    state.hi = state.hist.length - 1;
    histUi();
  }
  function histUi() { $('undoBtn').disabled = state.hi <= 0; $('redoBtn').disabled = state.hi >= state.hist.length - 1; }
  function load(s, opts = {}) {
    clearTimeout(histTimer);
    state.s = SHAPES.normalize(s);
    syncControls();
    update({ noHistory: opts.noHistory });
    if (!opts.noHistory) commit();
  }
  function undo() { clearTimeout(histTimer); commit(); if (state.hi > 0) { state.hi--; load(JSON.parse(state.hist[state.hi]), { noHistory: true }); histUi(); } }
  function redo() { if (state.hi < state.hist.length - 1) { state.hi++; load(JSON.parse(state.hist[state.hi]), { noHistory: true }); histUi(); } }

  /* ------------------------------------------------------------------ actions */
  const randomSeed = () => {
    const a = new Uint32Array(1);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.random() * 2 ** 32);
    return a[0] % 100000000;
  };
  function newShape() { if (state.locked) return; state.s.seed = randomSeed(); $('seed').value = state.s.seed; update(); }
  function surprise() { load(SHAPES.randomize(state.s, SHAPES.rng(randomSeed()), state.locked)); }
  function getSVG() { return SHAPES.render(state.s).svg; }

  /** Renders the current SVG to a PNG blob at the given scale (transparent when the background is off). */
  async function pngBlob(scale) {
    const W = state.s.w * scale, H = state.s.h * scale;
    const svg = getSVG().replace(`width="${state.s.w}" height="${state.s.h}"`, `width="${W}" height="${H}"`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
      return { blob, w: W, h: H };
    } finally { URL.revokeObjectURL(url); }
  }
  async function exportPng() {
    const btn = $('dlPng');
    btn.disabled = true; toast(t('pngBusy'));
    try {
      const r = await pngBlob(state.scale);
      download(`${fileBase()}@${state.scale}x.png`, r.blob);
      toast(t('pngDone', { w: r.w, h: r.h }));
    } catch (e) { toast(t('pngErr', { m: e.message || e })); } finally { btn.disabled = false; }
  }
  function shareUrl() { return location.origin + location.pathname + SHAPES.encodeHash(state.s); }

  /* ------------------------------------------------------------------ favourites */
  const favName = (s) => t('favName', { type: t('g_' + s.type), seed: s.seed });
  function saveFav() {
    state.favs.unshift({ s: JSON.parse(JSON.stringify(state.s)), at: Date.now() });
    state.favs = state.favs.slice(0, 36);
    store.set('favs', state.favs); buildFavs(); toast(t('favSaved'));
  }
  function buildFavs() {
    const ul = $('favs');
    ul.innerHTML = '';
    $('favEmpty').hidden = state.favs.length > 0;
    state.favs.forEach((fv, i) => {
      const s = SHAPES.normalize(fv.s), name = favName(s);
      const li = document.createElement('li'); li.className = 'fav';
      const open = document.createElement('button'); open.type = 'button'; open.className = 'open';
      open.setAttribute('aria-label', t('favOpen', { name })); open.title = name;
      const img = document.createElement('img'); img.alt = '';
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SHAPES.render(s).svg);
      open.appendChild(img);
      open.addEventListener('click', () => load(s));
      const del = document.createElement('button'); del.type = 'button'; del.className = 'del'; del.textContent = '✕';
      del.setAttribute('aria-label', t('favDelete', { name })); del.title = del.getAttribute('aria-label');
      del.addEventListener('click', () => { state.favs.splice(i, 1); store.set('favs', state.favs); buildFavs(); toast(t('favDeleted')); });
      li.append(open, del); ul.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ languages & theme */
  function applyLang() {
    const kab = state.lang === 'kab';
    document.documentElement.lang = kab && state.tfng ? 'kab-Tfng' : state.lang;
    document.body.classList.toggle('tfng-on', kab && state.tfng);
    $('lang').value = state.lang;
    $('tfngWrap').hidden = !kab; $('tfng').checked = state.tfng;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      for (const pair of el.dataset.i18nAttr.split(';')) { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(key)); }
    });
    $('helpBody').innerHTML = t('helpHtml');
    buildPalettePresets(); buildSizes(); syncControls(); buildFavs();
    if (state.last) draw();
  }
  function setTheme(th) {
    document.documentElement.dataset.theme = th;
    try { localStorage.setItem(KEY + 'theme', th); } catch (e) { /* ignore */ }
    document.querySelector('meta[name=theme-color]').content = th === 'dark' ? '#18151f' : '#5b3df5';
  }

  /* ------------------------------------------------------------------ events */
  function bind() {
    $('lang').addEventListener('change', (e) => { state.lang = e.target.value; store.set('lang', state.lang); applyLang(); });
    $('tfng').addEventListener('change', (e) => { state.tfng = e.target.checked; store.set('tfng', state.tfng); applyLang(); });
    $('themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('helpBtn').addEventListener('click', () => $('helpDlg').showModal());
    $('helpClose').addEventListener('click', () => $('helpDlg').close());
    $('helpDlg').addEventListener('click', (e) => { if (e.target === $('helpDlg')) $('helpDlg').close(); });

    $('newBtn').addEventListener('click', newShape);
    $('surpriseBtn').addEventListener('click', surprise);
    $('lockBtn').addEventListener('click', () => { state.locked = !state.locked; store.set('lock', state.locked); lockUi(); if (state.locked) toast(t('seedLocked')); });
    $('seed').addEventListener('change', (e) => {
      const v = e.target.value.trim();
      state.s.seed = /^\d+$/.test(v) ? Math.min(99999999, parseInt(v, 10)) : SHAPES.hashSeed(v || '0');
      e.target.value = state.s.seed; update();
    });
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('favBtn').addEventListener('click', saveFav);
    $('saveFav').addEventListener('click', saveFav);

    $('palPreset').addEventListener('change', (e) => {
      const p = SHAPES.PALETTES[e.target.value];
      if (p) { state.s.colors = p.slice(); buildSwatches(); update(); }
      e.target.value = '';
    });
    $('palRandom').addEventListener('click', () => { state.s.colors = SHAPES.randomPalette(SHAPES.rng(randomSeed())); buildSwatches(); update(); });
    $('palReverse').addEventListener('click', () => { state.s.colors.reverse(); buildSwatches(); update(); });
    $('angle').addEventListener('input', (e) => { state.s.angle = Number(e.target.value); $('angleOut').textContent = state.s.angle + '°'; update(); });
    $('strokeOn').addEventListener('change', (e) => { state.s.stroke = e.target.checked; update(); });
    $('strokeColor').addEventListener('input', (e) => { state.s.strokeColor = e.target.value.toLowerCase(); update(); });
    $('strokeWidth').addEventListener('input', (e) => { state.s.strokeWidth = Number(e.target.value); $('strokeWidthOut').textContent = fmtNum(state.s.strokeWidth, 1) + ' px'; update(); });
    $('bgOn').addEventListener('change', (e) => { state.s.bgOn = e.target.checked; update(); });
    $('bg').addEventListener('input', (e) => { state.s.bg = e.target.value.toLowerCase(); update(); });

    $('sizePreset').addEventListener('change', (e) => {
      const m = SHAPES.SIZES.find((z) => z[0] === e.target.value);
      state.s.size = e.target.value;
      if (m) { state.s.w = m[1]; state.s.h = m[2]; $('w').value = m[1]; $('h').value = m[2]; }
      update();
    });
    const dim = (key) => (e) => {
      const v = Math.round(Number(e.target.value));
      if (!Number.isFinite(v) || v < 16 || v > 8000) { e.target.value = state.s[key]; return; }
      state.s[key] = v; matchSize(); update();
    };
    $('w').addEventListener('change', dim('w'));
    $('h').addEventListener('change', dim('h'));
    $('swapBtn').addEventListener('click', () => {
      [state.s.w, state.s.h] = [state.s.h, state.s.w];
      $('w').value = state.s.w; $('h').value = state.s.h; matchSize(); update();
    });
    $('flipX').addEventListener('change', (e) => { state.s.flipX = e.target.checked; update(); });
    $('flipY').addEventListener('change', (e) => { state.s.flipY = e.target.checked; update(); });

    $('dlSvg').addEventListener('click', () => download(fileBase() + '.svg', new Blob([getSVG()], { type: 'image/svg+xml' })));
    $('copySvg').addEventListener('click', async () => toast(t((await copyText(getSVG())) ? 'svgCopied' : 'copyFail')));
    $('copyCss').addEventListener('click', async () => toast(t((await copyText(SHAPES.cssSnippet(getSVG()))) ? 'cssCopied' : 'copyFail')));
    $('copyLink').addEventListener('click', async () => toast(t((await copyText(shareUrl())) ? 'linkCopied' : 'copyFail')));
    $('dlPng').addEventListener('click', exportPng);
    $('dlJson').addEventListener('click', () => download(fileBase() + '.json', new Blob([JSON.stringify(state.s, null, 2)], { type: 'application/json' })));
    $('importJson').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try { const obj = JSON.parse(await file.text()); if (!obj || typeof obj !== 'object') throw new Error('json'); load(obj); toast(t('jsonOk')); } catch (err) { toast(t('jsonErr')); }
    });

    window.addEventListener('resize', fitStage);
    if (window.ResizeObserver) new ResizeObserver(fitStage).observe($('stagewrap'));
    window.addEventListener('hashchange', () => {
      const s = SHAPES.decodeHash(location.hash);
      if (s && JSON.stringify(s) !== JSON.stringify(SHAPES.normalize(state.s))) { load(s); toast(t('restored')); }
    });

    document.addEventListener('keydown', (e) => {
      const el = e.target, tag = el.tagName;
      const typing = tag === 'TEXTAREA' || (tag === 'INPUT' && !['checkbox', 'radio', 'range', 'color', 'button'].includes(el.type)) || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (typing) return;
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        return;
      }
      if (typing || e.altKey || $('helpDlg').open) return;
      const k = e.key.toLowerCase();
      if (k === 'n' || k === 'r') { e.preventDefault(); newShape(); } else if (k === 's') { e.preventDefault(); surprise(); } else if (k === 'f') { e.preventDefault(); saveFav(); } else if (/^[1-7]$/.test(k)) { e.preventDefault(); setType(SHAPES.TYPES[+k - 1]); }
    });
  }

  /* ------------------------------------------------------------------ start */
  function init() {
    const fromHash = SHAPES.decodeHash(location.hash);
    const last = store.get('last', null) ? SHAPES.normalize(store.get('last', null)) : null;
    if (fromHash && last) {
      // The link only carries the current generator's settings: keep this browser's settings for the other ones.
      for (const type of SHAPES.TYPES) if (type !== fromHash.type) fromHash.p[type] = last.p[type];
    }
    state.s = fromHash || last || SHAPES.defaults();
    buildGens(); bind(); applyLang();
    draw(); commit(); saveUrl();
    // Only announce a restore when the link differs from this browser's own autosave (e.g. a link shared by someone).
    if (fromHash && (!last || SHAPES.render(fromHash).svg !== SHAPES.render(last).svg)) toast(t('restored'));
    document.body.dataset.ready = '1';
  }
  // Small API used by the automated tests (and handy from the console).
  window.FA = { state, getSVG, pngBlob, load, undo, redo, setType, newShape, surprise, shareUrl };
  init();
})();
