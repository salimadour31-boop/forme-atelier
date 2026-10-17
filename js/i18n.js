/* i18n.js — Forme Atelier interface texts: French (default), English, Taqbaylit (Kabyle, Latin script) with an optional
 * Tifinagh rendering of the Kabyle texts. Each entry is [fr, en, kab]; placeholders look like {n}.
 * The Kabyle texts are a first draft — corrections are very welcome. Original texts, MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S = {
    skip: ['Aller à l’aperçu', 'Skip to the preview', 'Ddu ɣer teskant'],
    tagline: ['Formes organiques et fonds SVG — tout reste sur votre appareil', 'Organic shapes & SVG backgrounds — everything stays on your device', 'Talɣiwin d yigilalen SVG — kullec yeqqim ɣur-k'],
    language: ['Langue', 'Language', 'Tutlayt'],
    tifinagh: ['Tifinagh', 'Tifinagh', 'S tifinaɣ'],
    uiTheme: ['Thème clair / sombre', 'Light / dark theme', 'Asentel aceɛlal / aberkan'],
    help: ['Aide', 'Help', 'Tallalt'],
    close: ['Fermer', 'Close', 'Mdel'],
    generator: ['Générateur', 'Generator', 'Asegrav'],
    stageLabel: ['Aperçu de la forme générée', 'Preview of the generated shape', 'Taskant n talɣa yettwasegraven'],
    // generators
    g_blob: ['Blob', 'Blob', 'Talɣa tilelli'],
    g_wave: ['Vague', 'Wave', 'Tamewwijt'],
    g_layers: ['Vagues en couches', 'Layered waves', 'Timewwijin s tissiyin'],
    g_topo: ['Topographie', 'Topography', 'Izirigen n teɣzi'],
    g_scene: ['Scène', 'Scene', 'Asayes'],
    g_lowpoly: ['Low-poly', 'Low-poly', 'Ikraḍ-tɣemmar'],
    g_peaks: ['Sommets', 'Peaks', 'Idurar'],
    gd_blob: ['Une forme organique lisse, aléatoire et fermée — ou plusieurs anneaux concentriques.', 'A smooth, random, closed organic shape — or several concentric rings.', 'Talɣa tamɣelt, s ugacur, tamdelt — neɣ aṭas n tewnisin.'],
    gd_wave: ['Un bord ondulé en haut ou en bas de la toile : lisse, anguleux ou en escalier.', 'A wavy edge at the top or bottom of the canvas: smooth, sharp or stepped.', 'Ama s tmewwijt deg uflla neɣ deg wadda: tamɣelt, s teɣmar neɣ s tseddarin.'],
    gd_layers: ['Plusieurs vagues empilées avec un dégradé entre les couleurs de la palette.', 'Several stacked waves with a ramp between the palette colours.', 'Aṭas n tmewwijin yettwasbedden s umṣubbi n yiniten.'],
    gd_topo: ['Courbes de niveau d’un relief imaginaire (bruit fractal + marching squares), avec bandes colorées en option.', 'Contour lines of an imaginary terrain (fractal noise + marching squares), with optional colour bands.', 'Izirigen n teɣzi n wakal n tirga, s tɣawsiwin n yiniten ma tebɣiḍ.'],
    gd_scene: ['Composition de cercles, blobs, anneaux ou carrés éparpillés, avec flou doux en option.', 'Composition of scattered circles, blobs, rings or squares, with optional soft blur.', 'Tuddsa n tewnisin, n talɣiwin neɣ n yimkuẓen yettwazerɛen.'],
    gd_lowpoly: ['Mosaïque de triangles colorés le long d’un dégradé.', 'Mosaic of triangles coloured along a gradient.', 'Tafsifsa n yikraḍ-tɣemmar s yiniten.'],
    gd_peaks: ['Crêtes de montagnes superposées, brume et soleil en option.', 'Layered mountain ridges, with optional haze and sun.', 'Idurar yettwasbedden, s usigna d tafukt ma tebɣiḍ.'],
    // action bar
    newShape: ['Nouvelle forme', 'New shape', 'Talɣa tamaynut'],
    newShapeHint: ['Nouvelle graine (N)', 'New seed (N)', 'Aɛeqqa amaynut (N)'],
    seed: ['Graine', 'Seed', 'Aɛeqqa'],
    lockSeed: ['Verrouiller la graine', 'Lock the seed', 'Sekker aɛeqqa'],
    surprise: ['Surprise', 'Surprise', 'Tawraɣt'],
    surpriseHint: ['Réglages et couleurs au hasard (S)', 'Random settings and colours (S)', 'Iɣewwaren d yiniten s ugacur (S)'],
    undo: ['Annuler (Ctrl+Z)', 'Undo (Ctrl+Z)', 'Uɣal (Ctrl+Z)'],
    redo: ['Rétablir (Ctrl+Y)', 'Redo (Ctrl+Y)', 'Ales (Ctrl+Y)'],
    addFav: ['Ajouter aux favoris (F)', 'Add to favourites (F)', 'Rnu ɣer ismenyifen (F)'],
    stats: ['{w} × {h} px · {kb} Ko · {n} éléments', '{w} × {h} px · {kb} KB · {n} elements', '{w} × {h} px · {kb} KB · {n} n yiferdisen'],
    // sections
    secShape: ['Forme', 'Shape', 'Talɣa'],
    secColors: ['Couleurs', 'Colours', 'Initen'],
    secCanvas: ['Toile', 'Canvas', 'Taṭwilt'],
    secExport: ['Exporter', 'Export', 'Sifeḍ'],
    secFavs: ['Favoris', 'Favourites', 'Ismenyifen'],
    // parameters
    p_complexity: ['Complexité (points)', 'Complexity (points)', 'Tasukeft (tineqqiḍin)'],
    p_contrast: ['Contraste / hasard', 'Contrast / randomness', 'Amgired / agacur'],
    p_size: ['Taille', 'Size', 'Tiddi'],
    p_smooth: ['Douceur des courbes', 'Curve smoothness', 'Leqqaqa n yizligen'],
    p_rings: ['Anneaux', 'Rings', 'Tiwnisin'],
    p_cx: ['Position horizontale', 'Horizontal position', 'Adeg aglawi'],
    p_cy: ['Position verticale', 'Vertical position', 'Adeg ubdid'],
    p_side: ['Côté', 'Side', 'Tama'],
    p_style: ['Style', 'Style', 'Aɣanib'],
    p_height: ['Hauteur', 'Height', 'Teɣzi'],
    p_amplitude: ['Amplitude', 'Amplitude', 'Tehri n tmewwijt'],
    p_frequency: ['Fréquence (crêtes)', 'Frequency (crests)', 'Aseɣẓen (tiqacuṛin)'],
    p_randomness: ['Hasard', 'Randomness', 'Agacur'],
    p_layers_count: ['Nombre de couches', 'Number of layers', 'Amḍan n tissiyin'],
    p_scene_count: ['Nombre de formes', 'Number of shapes', 'Amḍan n talɣiwin'],
    p_peaks_count: ['Nombre de crêtes', 'Number of ridges', 'Amḍan n yidurar'],
    p_count: ['Nombre', 'Count', 'Amḍan'],
    p_opacity: ['Opacité', 'Opacity', 'Tiḍullest'],
    p_lines: ['Nombre de courbes', 'Number of lines', 'Amḍan n yizirigen'],
    p_scale: ['Échelle du relief', 'Terrain scale', 'Taskala n wakal'],
    p_detail: ['Détail', 'Detail', 'Talqayt'],
    p_lineWidth: ['Épaisseur des lignes', 'Line width', 'Tuzert n yizirigen'],
    p_lineColor: ['Couleur des lignes', 'Line colour', 'Ini n yizirigen'],
    p_resolution: ['Résolution de la grille', 'Grid resolution', 'Tabadut n uẓeṭṭa'],
    p_showLines: ['Afficher les lignes', 'Show lines', 'Sken izirigen'],
    p_bands: ['Bandes colorées', 'Colour bands', 'Tiɣawsiwin s yiniten'],
    p_smoothLines: ['Lisser les lignes', 'Smooth lines', 'Sleqqaq izirigen'],
    p_shape: ['Forme', 'Shape', 'Talɣa'],
    p_sizeMin: ['Taille min.', 'Min. size', 'Tiddi taddayt'],
    p_sizeMax: ['Taille max.', 'Max. size', 'Tiddi tafellayt'],
    p_blur: ['Flou doux', 'Soft blur', 'Asfeḍ'],
    p_overlap: ['Autoriser le chevauchement', 'Allow overlap', 'Sireg anemyekcam'],
    p_cells: ['Cellules (en largeur)', 'Cells (across)', 'Tixxamin (s tehri)'],
    p_jitter: ['Irrégularité', 'Jitter', 'Arelqay'],
    p_variance: ['Variation de couleur', 'Colour variance', 'Abeddel n yini'],
    p_angle: ['Direction du dégradé', 'Gradient direction', 'Tanila n umṣubbi'],
    p_rugged: ['Relief accidenté', 'Ruggedness', 'Aqejjer n wakal'],
    p_haze: ['Brume (crêtes du fond plus pâles)', 'Haze (paler back ridges)', 'Asigna'],
    p_sun: ['Soleil', 'Sun', 'Tafukt'],
    o_bottom: ['Bas', 'Bottom', 'Adda'], o_top: ['Haut', 'Top', 'Afella'],
    o_smooth: ['Lisse', 'Smooth', 'Amɣel'], o_sharp: ['Anguleux', 'Sharp', 'S teɣmar'], o_step: ['Escalier', 'Steps', 'Tiseddarin'],
    o_ramp: ['Dégradé de la palette', 'Palette ramp', 'Amṣubbi n tfelwit'], o_first: ['1re couleur', '1st colour', 'Ini amezwaru'],
    o_last: ['Dernière couleur', 'Last colour', 'Ini aneggaru'], o_stroke: ['Couleur de contour', 'Stroke colour', 'Ini n yiri'],
    o_circles: ['Cercles', 'Circles', 'Tiwnisin'], o_blobs: ['Blobs', 'Blobs', 'Talɣiwin tilelliyin'], o_rings: ['Anneaux', 'Rings', 'Tixatmin'],
    o_squares: ['Carrés', 'Squares', 'Imkuẓen'], o_mixed: ['Mélange', 'Mixed', 'Yemxalaḍ'],
    // colours
    palette: ['Palette', 'Palette', 'Tafelwit'],
    colorN: ['Couleur {n}', 'Colour {n}', 'Ini {n}'],
    removeColor: ['Retirer la couleur {n}', 'Remove colour {n}', 'Kkes ini {n}'],
    addColor: ['Ajouter une couleur', 'Add a colour', 'Rnu ini'],
    presetPalette: ['Palettes prêtes', 'Ready-made palettes', 'Tifelwiyin yewjden'],
    choose: ['— choisir —', '— choose —', '— fren —'],
    randomPalette: ['Palette au hasard', 'Random palette', 'Tafelwit s ugacur'],
    reversePalette: ['Inverser', 'Reverse', 'Tti'],
    fillMode: ['Remplissage', 'Fill', 'Taččart'],
    f_solid: ['Uni', 'Solid', 'Yiwen yini'], f_linear: ['Dégradé linéaire', 'Linear gradient', 'Amṣubbi izirig'],
    f_radial: ['Dégradé radial', 'Radial gradient', 'Amṣubbi d tawinest'], f_none: ['Aucun', 'None', 'Ulac'],
    gradAngle: ['Angle du dégradé', 'Gradient angle', 'Tiɣmert n umṣubbi'],
    strokeOn: ['Contour', 'Stroke', 'Iri'],
    strokeColor: ['Couleur du contour', 'Stroke colour', 'Ini n yiri'],
    strokeWidth: ['Épaisseur du contour', 'Stroke width', 'Tuzert n yiri'],
    bgOn: ['Fond coloré (sinon transparent)', 'Background colour (otherwise transparent)', 'Agilal s yini (neɣ d afrawan)'],
    bgColor: ['Couleur de fond', 'Background colour', 'Ini n ugilal'],
    pal_aurore: ['Aurore', 'Dawn', 'Tafrara'], pal_lagon: ['Lagon', 'Lagoon', 'Lagun'], pal_sahara: ['Sahara', 'Sahara', 'Tiniri'],
    pal_olivier: ['Olivier', 'Olive tree', 'Azemmur'], pal_nuit: ['Nuit', 'Night', 'Iḍ'], pal_menthe: ['Menthe', 'Mint', 'Naɛnaɛ'],
    pal_brique: ['Brique', 'Brick', 'Ajur'], pal_tamazgha: ['Tamazgha', 'Tamazgha', 'Tamazɣa'], pal_encre: ['Encre', 'Ink', 'Smaq'],
    pal_pastel: ['Pastel', 'Pastel', 'Pastel'], pal_crepuscule: ['Crépuscule', 'Dusk', 'Tameddit'],
    warnNothing: ['Remplissage « Aucun » et contour désactivé : rien n’est visible.', 'Fill “None” and stroke off: nothing is visible.', 'Ulac taččart, ulac iri: ulac ayen ara d-iban.'],
    // canvas
    sizePreset: ['Format', 'Format', 'Amasal'],
    sz_hd: ['Paysage 16:9', 'Landscape 16:9', 'Aglawi 16:9'], sz_square: ['Carré 1:1', 'Square 1:1', 'Amkuẓ 1:1'],
    sz_story: ['Story 9:16', 'Story 9:16', 'Story 9:16'], sz_portrait: ['Portrait 4:5', 'Portrait 4:5', 'Ubdid 4:5'],
    sz_a4: ['A4 portrait (300 dpi)', 'A4 portrait (300 dpi)', 'A4 ubdid (300 dpi)'], sz_a4l: ['A4 paysage (300 dpi)', 'A4 landscape (300 dpi)', 'A4 aglawi (300 dpi)'],
    sz_banner: ['Bannière 3:1', 'Banner 3:1', 'Abendu 3:1'], sz_og: ['Aperçu de lien 1,91:1', 'Link preview 1.91:1', 'Taskant n useɣwen 1,91:1'],
    sz_custom: ['Personnalisé', 'Custom', 'Udmawan'],
    width: ['Largeur (px)', 'Width (px)', 'Tehri (px)'], height: ['Hauteur (px)', 'Height (px)', 'Teɣzi (px)'],
    swapDims: ['Échanger largeur et hauteur', 'Swap width and height', 'Beddel tehri d teɣzi'],
    rotation: ['Rotation', 'Rotation', 'Tuzzya'],
    flipX: ['Miroir horizontal', 'Flip horizontally', 'Lemri aglawi'], flipY: ['Miroir vertical', 'Flip vertically', 'Lemri ubdid'],
    // export
    dlSVG: ['Télécharger SVG', 'Download SVG', 'Sader SVG'], copySVG: ['Copier le code SVG', 'Copy SVG code', 'Nɣel tangalt SVG'],
    pngScale: ['Échelle PNG', 'PNG scale', 'Taskala PNG'], dlPNG: ['Télécharger PNG', 'Download PNG', 'Sader PNG'],
    copyCSS: ['Copier le CSS (data-URI)', 'Copy CSS (data URI)', 'Nɣel CSS (data-URI)'],
    dlJSON: ['Réglages JSON', 'Settings JSON', 'Iɣewwaren JSON'], importJSON: ['Importer JSON', 'Import JSON', 'Kter JSON'],
    copyLink: ['Copier le lien de partage', 'Copy share link', 'Nɣel aseɣwen n beṭṭu'],
    codeOut: ['Code copié', 'Copied code', 'Tangalt yettwanɣel'],
    pngInfo: ['PNG {w} × {h} px, transparent si le fond est désactivé.', 'PNG {w} × {h} px, transparent when the background is off.', 'PNG {w} × {h} px, d afrawan ma yensa ugilal.'],
    // favourites
    saveFav: ['Enregistrer la forme', 'Save this shape', 'Sekles talɣa-agi'],
    favEmpty: ['Aucun favori pour l’instant. Ils restent dans ce navigateur (localStorage).', 'No favourites yet. They stay in this browser (localStorage).', 'Ulac ismenyifen akka tura. Ad qqimen deg yiminig-agi.'],
    favOpen: ['Ouvrir : {name}', 'Open: {name}', 'Ldi: {name}'],
    favDelete: ['Supprimer : {name}', 'Delete: {name}', 'Kkes: {name}'],
    favName: ['{type} · graine {seed}', '{type} · seed {seed}', '{type} · aɛeqqa {seed}'],
    // toasts
    svgCopied: ['Code SVG copié.', 'SVG code copied.', 'Tangalt SVG tettwanɣel.'],
    cssCopied: ['CSS copié.', 'CSS copied.', 'CSS yettwanɣel.'],
    linkCopied: ['Lien copié : il restaure exactement cette forme.', 'Link copied: it restores exactly this shape.', 'Aseɣwen yettwanɣel: ad d-yerr talɣa-agi.'],
    copyFail: ['Copie impossible — sélectionnez le code ci-dessous.', 'Copy failed — select the code below.', 'Ur yettwanɣel ara — fren tangalt.'],
    pngDone: ['PNG enregistré ({w} × {h} px).', 'PNG saved ({w} × {h} px).', 'PNG yettwasekles ({w} × {h} px).'],
    pngErr: ['Échec du rendu PNG : {m}', 'PNG rendering failed: {m}', 'Tuccḍa n PNG: {m}'],
    pngBusy: ['Rendu PNG…', 'Rendering PNG…', 'Asefsu n PNG…'],
    jsonOk: ['Réglages importés.', 'Settings imported.', 'Iɣewwaren ttwaktren.'],
    jsonErr: ['Fichier JSON illisible.', 'Unreadable JSON file.', 'Afaylu JSON ur yettwaɣer ara.'],
    favSaved: ['Ajouté aux favoris.', 'Added to favourites.', 'Yettwarna ɣer ismenyifen.'],
    favDeleted: ['Favori supprimé.', 'Favourite deleted.', 'Yettwakkes.'],
    restored: ['Forme restaurée depuis le lien.', 'Shape restored from the link.', 'Talɣa tuɣal-d seg useɣwen.'],
    seedLocked: ['Graine verrouillée.', 'Seed locked.', 'Aɛeqqa yettwasekker.'],
    footer: ['Gratuit et libre (licence MIT). Tout est calculé dans votre navigateur : aucune image, aucun réglage n’est envoyé.', 'Free and open source (MIT licence). Everything is computed in your browser: no image or setting is ever uploaded.', 'Baṭel u d ilelli (MIT). Kullec yettwasiḍen deg yiminig-ik: ulac ayen ara yettwaznen.'],
    source: ['Code source', 'Source code', 'Tangalt taɣbalut'],
    helpTitle: ['Comment ça marche', 'How it works', 'Amek iteddu'],
    helpHtml: [
      `<p><strong>Forme Atelier</strong> génère des formes organiques et des fonds vectoriels pour vos maquettes, sites, affiches et réseaux sociaux.</p>
<ol><li>Choisissez un <strong>générateur</strong> : blob, vague, vagues en couches, topographie, scène, low-poly ou sommets.</li>
<li>Réglez la <strong>forme</strong> avec les curseurs. La <strong>graine</strong> fixe le tirage aléatoire : même graine + mêmes réglages = même forme, toujours.</li>
<li><strong>Nouvelle forme</strong> change la graine ; <strong>Surprise</strong> tire aussi les réglages et les couleurs (le cadenas garde la graine).</li>
<li>Composez la <strong>palette</strong> (2 à 8 couleurs), le remplissage uni ou en dégradé, le contour et le fond (ou transparent).</li>
<li>Choisissez le <strong>format</strong> de la toile, la rotation et les miroirs.</li>
<li><strong>Exportez</strong> en SVG optimisé, PNG 1× / 2× / 4×, CSS (data-URI) ou JSON, ou copiez le lien qui restaure exactement la forme.</li></ol>
<p>Clavier (hors champs de saisie) : <kbd>N</kbd> nouvelle forme, <kbd>S</kbd> surprise, <kbd>F</kbd> favori, <kbd>1</kbd>–<kbd>7</kbd> générateurs, <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> annuler / rétablir.</p>
<p>Rien ne quitte votre appareil : pas de serveur, pas de traceur, pas de police externe.</p>`,
      `<p><strong>Forme Atelier</strong> generates organic shapes and vector backgrounds for mockups, websites, posters and social media.</p>
<ol><li>Pick a <strong>generator</strong>: blob, wave, layered waves, topography, scene, low-poly or peaks.</li>
<li>Tune the <strong>shape</strong> with the sliders. The <strong>seed</strong> fixes the randomness: same seed + same settings = same shape, every time.</li>
<li><strong>New shape</strong> changes the seed; <strong>Surprise</strong> also draws random settings and colours (the padlock keeps the seed).</li>
<li>Build the <strong>palette</strong> (2 to 8 colours), solid or gradient fill, stroke and background (or transparent).</li>
<li>Choose the canvas <strong>format</strong>, rotation and mirroring.</li>
<li><strong>Export</strong> an optimised SVG, PNG 1× / 2× / 4×, CSS (data URI) or JSON, or copy the link that restores the exact shape.</li></ol>
<p>Keyboard (outside text fields): <kbd>N</kbd> new shape, <kbd>S</kbd> surprise, <kbd>F</kbd> favourite, <kbd>1</kbd>–<kbd>7</kbd> generators, <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> undo / redo.</p>
<p>Nothing leaves your device: no server, no tracker, no external font.</p>`,
      `<p><strong>Forme Atelier</strong> yesgravay talɣiwin d yigilalen ivikturen i yisenfaren, ismal d yiɣmisen.</p>
<ol><li>Fren <strong>asegrav</strong>: talɣa tilelli, tamewwijt, timewwijin s tissiyin, izirigen n teɣzi, asayes, ikraḍ-tɣemmar neɣ idurar.</li>
<li>Seggem <strong>talɣa</strong>. <strong>Aɛeqqa</strong> yettḥerriz agacur: yiwen uɛeqqa + yiwen n yiɣewwaren = yiwet n talɣa.</li>
<li><strong>Talɣa tamaynut</strong> tbeddel aɛeqqa; <strong>Tawraɣt</strong> tbeddel daɣen iɣewwaren d yiniten.</li>
<li>Heyyi <strong>tafelwit</strong> (2 ar 8 yiniten), taččart, iri d ugilal.</li>
<li>Fren <strong>amasal</strong> n teṭwilt, tuzzya d lemri.</li>
<li><strong>Sifeḍ</strong> SVG, PNG 1× / 2× / 4×, CSS neɣ JSON, neɣ nɣel aseɣwen.</li></ol>
<p>Anasiw: <kbd>N</kbd>, <kbd>S</kbd>, <kbd>F</kbd>, <kbd>1</kbd>–<kbd>7</kbd>, <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>.</p>
<p>Ulac ayen ara yeffeɣ seg yibenk-ik.</p>`,
    ],
  };
  const LANGS = ['fr', 'en', 'kab'];
  const idx = (lang) => Math.max(0, LANGS.indexOf(lang));

  // Kabyle Latin → Tifinagh (neo-Tifinagh as used for Taqbaylit). Acronyms, units, names and words with digits are kept.
  const TF = { a: 'ⴰ', b: 'ⴱ', c: 'ⵛ', č: 'ⵞ', d: 'ⴷ', ḍ: 'ⴹ', e: 'ⴻ', é: 'ⴻ', ɛ: 'ⵄ', f: 'ⴼ', g: 'ⴳ', ǧ: 'ⴵ', ɣ: 'ⵖ', h: 'ⵀ', ḥ: 'ⵃ', i: 'ⵉ', j: 'ⵊ', k: 'ⴽ', l: 'ⵍ', m: 'ⵎ', n: 'ⵏ',
    o: 'ⵓ', p: 'ⵒ', q: 'ⵇ', r: 'ⵔ', ṛ: 'ⵕ', s: 'ⵙ', ṣ: 'ⵚ', t: 'ⵜ', ṭ: 'ⵟ', u: 'ⵓ', v: 'ⵠ', w: 'ⵡ', x: 'ⵅ', y: 'ⵢ', z: 'ⵣ', ẓ: 'ⵥ' };
  const KEEP = /^(Forme|Atelier|Story|Pastel|Ctrl|data-URI|Low-poly|localStorage|kbd|strong|ol|li|p|MIT)$/;
  function toTifinagh(text) {
    return String(text).replace(/(<[^>]*>)|(\{[^}]*\})|([^<{]+)/g, (m, tag, ph, txt) => tag || ph || txt.replace(/[\p{L}\d-]+/gu, (w) => {
      if (/\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) || KEEP.test(w)) return w;
      return Array.from(w.toLowerCase()).map((ch) => TF[ch] || ch).join('');
    }));
  }
  /** Translate key into lang; vars fill {placeholders}; tfng renders Kabyle in Tifinagh. Missing key → the key. */
  function t(key, lang = 'fr', vars, tfng = false) {
    const e = S[key];
    let s = e ? e[idx(lang)] : key;
    if (lang === 'kab' && tfng) s = toTifinagh(s);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  return { S, LANGS, t, toTifinagh, has: (k) => k in S };
});
