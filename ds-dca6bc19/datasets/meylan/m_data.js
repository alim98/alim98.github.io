/* Meylan 2026 course, part 1: loaders, label vocabulary and colour helpers. */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = (DS.meylan = DS.meylan || {});
  M.base = 'datasets/meylan/';
  const once = {};
  const memo = (k, fn) => once[k] || (once[k] = fn());
  M.col = (v) => () => DS.css(v);

  /* tier2 codes in the bundles: 0-5 tumour states, 6 macrophage/monocyte, 7 neutrophil, 8 DC, 9 T, 10 NK,
     11 B, 12 plasma, 13 vasculature, 14 stromal, 15 low count/necrotic, 255 no label. */
  M.STATE_NAMES = ['AC-like', 'OPC-like', 'NPC-like 1', 'NPC-like 2', 'MES-like 1', 'MES-like 2 (hypoxia)'];
  M.STATE_COLORS = ['--c1', '--c3', '--c7', '--c5', '--c4', '--c8'];
  M.TYPE_NAMES = ['Tumour cells', 'Macrophages/monocytes', 'Neutrophils', 'Dendritic cells', 'T cells', 'NK cells',
    'B cells', 'Plasma cells', 'Vasculature', 'Stromal cells', 'Low count/necrotic'];
  M.TCELLS = ['CD8 tissue-resident', 'CD8 stem-like', 'CD8 IFN-responsive', 'CD8 early activated',
    'CD8 proliferative', 'CD8 chemokine-producing', 'CD8 NK-like', 'CD8 undefined', 'CD4 tissue-resident',
    'CD4 T regulatory'];
  M.COMP = [
    { key: 'tumour', label: 'Tumour cells', color: '--c1', t2: [0, 1, 2, 3, 4, 5] },
    { key: 'myeloid', label: 'Myeloid cells', color: '--c2', t2: [6, 7, 8] },
    { key: 'tnk', label: 'T and NK cells', color: '--c3', t2: [9, 10] },
    { key: 'bpl', label: 'B and plasma cells', color: '--c4', t2: [11, 12] },
    { key: 'vasc', label: 'Vessels and stroma', color: '--c5', t2: [13, 14] },
    { key: 'low', label: 'Low count / no label', color: '--null', t2: [15, 255] },
  ];
  M.compOf = new Uint8Array(256).fill(5);
  M.COMP.forEach((c, k) => c.t2.forEach((t) => (M.compOf[t] = k)));
  M.typeIdx = (t2) => (t2 < 6 ? 0 : t2 === 255 ? 10 : t2 - 5);
  M.typeName = (t2) => (t2 === 255 ? 'No label' : t2 < 6 ? 'Tumour · ' + M.STATE_NAMES[t2] : M.TYPE_NAMES[t2 - 5]);
  M.PATIENTS = ['P05', 'P21', 'P28', 'P32', 'P34', 'P45', 'P46', 'P51'];
  M.secLabel = (sec) => sec.replace('_PRE_', ' PRE piece ').replace('_PRE', ' PRE').replace('_POST', ' POST');

  /* ---- data ---- */
  M.stats = () => DS.json(M.base + 'data/stats.json');
  M.outlines = () => DS.json(M.base + 'data/outlines.json');
  M.window = () => DS.json(M.base + 'data/xenium_window.json');
  M.tissueIndex = () => DS.json(M.base + 'data/tissue/index.json');
  M.umap = () => memo('umap', () => DS.json(M.base + 'data/umap.json').then((u) => {
    const a = DS.b64(u.u1, Int16Array), b = DS.b64(u.u2, Int16Array);
    const x = new Float32Array(a.length), y = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) { x[i] = a[i] / 100; y[i] = b[i] / 100; }
    const expr = {}; u.genes.forEach((g) => (expr[g] = DS.b64(u.expr[g])));
    const scores = {}; Object.keys(u.scores).forEach((k) => (scores[k] = DS.b64(u.scores[k], Int16Array)));
    return { n: u.n, x, y, sample: DS.b64(u.sample), t2: DS.b64(u.t2), tt: DS.b64(u.tt),
      total: DS.b64(u.total, Uint16Array), hsv: DS.b64(u.hsv), tcr: DS.b64(u.tcr), expr, genes: u.genes, scores,
      samples: u.samples };
  }));
  M.tissue = (sec) => memo('t:' + sec, () => DS.json(M.base + 'data/tissue/' + sec + '.json').then((t) => {
    const xs = DS.b64(t.x, Uint16Array), ys = DS.b64(t.y, Uint16Array);
    const x = new Float32Array(xs.length), y = new Float32Array(xs.length);
    for (let i = 0; i < xs.length; i++) { x[i] = xs[i] / 2; y[i] = ys[i] / 2; }
    const expr = {}; t.genes.forEach((g) => (expr[g] = DS.b64(t.expr[g])));
    return { section: t.section, sample: t.sample, n: t.n, nTotal: t.n_total, window: t.window,
      outline: DS.b64(t.outline, Uint16Array), outlineBin: t.outline_bin, x, y, t2: DS.b64(t.t2), tt: DS.b64(t.tt),
      total: DS.b64(t.total, Uint16Array), hsv: DS.b64(t.hsv), expr, genes: t.genes };
  }));

  /* ---- colour layers ---- */
  const BINS = [[1, 1], [2, 2], [3, 4], [5, 9], [10, 255]];
  const RAMP = ['--s2', '--s3', '--s4', '--s5', '--s6'];
  M.RAMP = RAMP;
  M.groupIdx = (n, keyFn, K) => {
    const L = Array.from({ length: K }, () => []);
    for (let i = 0; i < n; i++) { const k = keyFn(i); if (k >= 0) L[k].push(i); }
    return L.map((l) => Int32Array.from(l));
  };
  M.catLayers = (lists, cats, focus, nullIdx) => {
    const out = [];
    if (nullIdx && nullIdx.length) out.push({ idx: nullIdx, color: M.col('--null'), alpha: 0.6 });
    const order = lists.map((l, k) => k).sort((a, b) => lists[b].length - lists[a].length);
    for (const k of order) {
      if (!lists[k].length) continue;
      if (focus != null && focus !== k) out.unshift({ idx: lists[k], color: M.col('--null'), alpha: 0.45 });
      else out.push({ idx: lists[k], color: M.col(cats[k].color) });
    }
    return out;
  };
  M.geneLayers = (v, n) => {
    const zero = [], bins = BINS.map(() => []);
    for (let i = 0; i < n; i++) {
      const c = v[i];
      if (!c) { zero.push(i); continue; }
      for (let b = BINS.length - 1; b >= 0; b--) if (c >= BINS[b][0]) { bins[b].push(i); break; }
    }
    return [{ idx: Int32Array.from(zero), color: M.col('--null'), alpha: 0.55 }]
      .concat(bins.map((l, b) => ({ idx: Int32Array.from(l), color: M.col(RAMP[b]) })));
  };
  M.geneKey = (parent, gene) => {
    parent.innerHTML = '';
    const parts = [h('i', { style: 'background:var(--null)' }), '0'];
    BINS.forEach((b, k) => parts.push(h('i', { style: `background:var(${RAMP[k]})` }),
      b[0] === b[1] ? String(b[0]) : b[1] === 255 ? b[0] + '+' : b[0] + '–' + b[1]));
    parent.append(h('span', { class: 'ramp' }, parts, h('span', { style: 'margin-left:6px' },
      `molecules of ${gene} counted in the cell`)));
  };
  M.scoreKey = (parent, label) => {
    parent.innerHTML = '';
    parent.append(h('span', { class: 'ramp' }, h('i', { style: 'background:var(--null)' }), '0',
      RAMP.map((r) => h('i', { style: `background:var(${r})` })), 'high',
      h('span', { style: 'margin-left:6px' }, label)));
  };
  /* categorical colouring modes shared by the UMAP and tissue views */
  M.categorical = (d, mode) => {
    const n = d.x.length;
    if (mode === 'comp') return { lists: M.groupIdx(n, (i) => M.compOf[d.t2[i]], M.COMP.length), cats: M.COMP };
    if (mode === 'type') {
      const grp = [0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5];
      return { lists: M.groupIdx(n, (i) => M.typeIdx(d.t2[i]), 11),
        cats: M.TYPE_NAMES.map((t, k) => ({ label: t, color: M.COMP[grp[k]].color })) };
    }
    if (mode === 'state') {
      const rest = []; for (let i = 0; i < n; i++) if (d.t2[i] >= 6) rest.push(i);
      return { lists: M.groupIdx(n, (i) => (d.t2[i] < 6 ? d.t2[i] : -1), 6),
        cats: M.STATE_NAMES.map((t, k) => ({ label: t, color: M.STATE_COLORS[k] })), nullIdx: Int32Array.from(rest) };
    }
    if (mode === 'tcell') {
      const pal = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--s4', '--s6'];
      const rest = []; for (let i = 0; i < n; i++) if (d.tt[i] >= 10) rest.push(i);
      return { lists: M.groupIdx(n, (i) => (d.tt[i] < 10 ? d.tt[i] : -1), 10),
        cats: M.TCELLS.map((t, k) => ({ label: t, color: pal[k] })), nullIdx: Int32Array.from(rest) };
    }
    if (mode === 'patient') {
      const pal = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
      return { lists: M.groupIdx(n, (i) => d.sample[i] >> 1, 8),
        cats: M.PATIENTS.map((p, k) => ({ label: p, color: pal[k] })) };
    }
    if (mode === 'time') return { lists: M.groupIdx(n, (i) => d.sample[i] & 1, 2),
      cats: [{ label: 'PRE (before)', color: '--c2' }, { label: 'POST (after)', color: '--c1' }] };
    return null;
  };
})();
