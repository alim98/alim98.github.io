/* Meylan course, part 3: the tissue map and the section-size figure. */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;

  M.tissueView = async function (parent, o) {
    o = o || {};
    const stats = await M.stats(), tidx = await M.tissueIndex();
    const wrap = h('div', { class: 'plot-wrap' });
    const ctl = h('div', { class: 'controls' }), box = h('div'), keyBox = h('div'), cap = h('div', { class: 'caption' });
    wrap.append(ctl, box, keyBox, cap); parent.append(wrap);
    let sec = o.section || 'P28_PRE', mode = o.mode || 'comp', gene = o.gene || 'CD3E', d = null, focus = null, marks = [];

    function drawInset(ctx, p) {
      const a = d.outline, bin = d.outlineBin;
      let mw = 0, mh = 0;
      for (let i = 0; i < a.length; i += 2) { if (a[i] > mw) mw = a[i]; if (a[i + 1] > mh) mh = a[i + 1]; }
      const S = Math.min(110 / (mw + 1), 80 / (mh + 1)), x0 = 12, y0 = 12;
      ctx.globalAlpha = 0.93; ctx.fillStyle = DS.css('--bg');
      ctx.fillRect(x0 - 6, y0 - 6, (mw + 1) * S + 12, (mh + 1) * S + 26); ctx.globalAlpha = 1;
      ctx.fillStyle = DS.css('--null');
      for (let i = 0; i < a.length; i += 2) ctx.fillRect(x0 + a[i] * S, y0 + a[i + 1] * S, Math.max(1, S), Math.max(1, S));
      const w = d.window;
      ctx.strokeStyle = DS.css('--c8'); ctx.lineWidth = 2;
      ctx.strokeRect(x0 + (w[0] / bin) * S, y0 + (w[1] / bin) * S, (w[2] / bin) * S, (w[2] / bin) * S);
      ctx.fillStyle = DS.css('--ink-2'); ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText('whole section · red = shown', x0, y0 + (mh + 1) * S + 4);
    }
    const plot = new DS.Plot2D(box, {
      height: (w) => Math.min(o.maxH || 580, Math.max(330, w * 0.68)), pointUnits: 4.2, minR: 0.7, maxR: 9,
      clickable: !!o.onClick, label: 'Map of cells in a tissue section',
      tip: (i) => `<b>${M.typeName(d.t2[i])}</b>${d.tt[i] < 10 ? '<br>' + M.TCELLS[d.tt[i]] : ''}`
        + `<br>${d.total[i]} molecules`
        + (mode === 'gene' ? `<br>${gene}: ${d.expr[gene][i]}` : mode === 'hsv' ? `<br>HSV-1: ${d.hsv[i]}` : ''),
      onClick: o.onClick ? (X, Y) => o.onClick(X, Y, d, api) : null,
      overlay: (ctx, p) => {
        DS.scaleBar(ctx, p);
        ctx.lineWidth = 2; ctx.strokeStyle = DS.css('--ink');
        for (const m of marks) { ctx.beginPath(); ctx.arc(p.sx(m.x), p.sy(m.y), m.r * p.view.s, 0, 6.2832); ctx.stroke(); }
        if (d && d.window && o.inset !== false) drawInset(ctx, p);
      },
    });
    function render() {
      keyBox.innerHTML = '';
      if (mode === 'gene' || mode === 'hsv') {
        plot.setLayers(M.geneLayers(mode === 'gene' ? d.expr[gene] : d.hsv, d.n));
        M.geneKey(keyBox, mode === 'gene' ? gene : 'HSV-1 (5 viral probes)'); return;
      }
      if (mode === 'depth') {
        const v = d.total, sorted = Array.from(v).sort((a, b) => a - b);
        const hi = sorted[Math.floor(sorted.length * 0.97)] || 1;
        const bins = [[], [], [], [], []];
        for (let i = 0; i < d.n; i++) bins[Math.min(4, Math.floor((v[i] / hi) * 5))].push(i);
        plot.setLayers(bins.map((l, k) => ({ idx: Int32Array.from(l), color: M.col(M.RAMP[k]) })));
        M.scoreKey(keyBox, 'total molecules counted in the cell'); return;
      }
      if (mode === 'custom' && o.layers) { plot.setLayers(o.layers(d)); if (o.legend) o.legend(keyBox, d); return; }
      const cat = M.categorical(d, mode);
      plot.setLayers(M.catLayers(cat.lists, cat.cats, focus, cat.nullIdx));
      DS.legend(keyBox, cat.cats.map((c, k) => ({ key: k, label: c.label, color: M.col(c.color),
        count: F.int(cat.lists[k].length) })), (fk) => {
        focus = fk; plot.setLayers(M.catLayers(cat.lists, cat.cats, fk, cat.nullIdx));
      });
    }
    async function load() {
      box.style.opacity = 0.45; d = await M.tissue(sec); box.style.opacity = 1; marks = [];
      plot.setPoints(d.x, d.y); render();
      const si = stats.sections[sec];
      cap.innerHTML = DS.markup(`<b>${M.secLabel(sec)}</b> · `
        + (d.window ? `a ${(d.window[2] / 1000).toFixed(1)} mm square centred on the most T-cell-rich part of the section, holding ${F.int(d.n)} of its ${F.int(d.nTotal)} cells (inset) — the counts below describe this window, not the whole section`
          : `all ${F.int(d.n)} cells`)
        + ` · tissue area ${si.footprint_mm2} mm² · run ${si.date} on instrument slide ${si.slide}. `
        + 'One dot is one cell, at the centre of its nucleus. ' + (o.caption || ''));
      if (o.onLoad) o.onLoad(d, api);
    }
    if (o.controls !== false) {
      if (o.sectionSelect !== false) {
        const secs = Object.keys(tidx.sections).sort();
        ctl.append(DS.select('tsec-' + (o.id || 'a'), secs.map((k) => [k, M.secLabel(k)]), sec,
          (v) => { sec = v; load(); }, 'Section'));
      }
      ctl.append(DS.seg(o.modes || [['comp', 'Cell type'], ['state', 'Tumour state'], ['tcell', 'T-cell state'],
        ['gene', 'Gene'], ['hsv', 'HSV-1'], ['depth', 'Molecules per cell']], mode,
        (m) => { mode = m; focus = null; render(); }));
      ctl.append(DS.select('tgen-' + (o.id || 'a'), tidx.genes.map((g) => [g, g]), gene,
        (g) => { gene = g; mode = 'gene'; render(); }, 'Gene'));
    }
    const api = { plot, get data() { return d; }, render,
      mark(x, y, r) { marks = [{ x, y, r }]; plot.draw(); },
      setMode(m) { mode = m; focus = null; render(); },
      setSection(v) { sec = v; return load(); } };
    await load();
    return api;
  };

  /* every tissue piece drawn at one shared scale: PRE pieces beside the POST section */
  M.sizeFigure = async function (parent) {
    const o = await M.outlines(), S = o.sections;
    const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px' });
    parent.append(grid);
    const items = M.PATIENTS.map((p) => ({
      p, pre: Object.keys(S).filter((k) => k.indexOf(p + '_PRE') === 0).sort(), post: p + '_POST',
    }));
    const rowW = (it) => it.pre.reduce((a, k) => a + S[k].w + 5, 0) + S[it.post].w + 6;
    const maxW = Math.max.apply(null, items.map(rowW));
    const maxH = Math.max.apply(null, Object.keys(S).map((k) => S[k].h));
    const dec = {}; Object.keys(S).forEach((k) => (dec[k] = DS.b64(S[k].cells, Uint16Array)));
    const cards = items.map((it) => {
      const cv = h('canvas', { role: 'img', 'aria-label': it.p + ' PRE and POST tissue area at the same scale' });
      const preA = it.pre.reduce((a, k) => a + S[k].mm2, 0);
      const card = h('div', { class: 'card', style: 'padding:10px;display:grid;gap:6px' },
        h('div', { class: 'row small', style: 'justify-content:space-between' }, h('b', null, it.p),
          h('span', { class: 'muted tnum' }, `PRE ${preA.toFixed(1)} · POST ${S[it.post].mm2.toFixed(0)} mm²`)), cv);
      grid.append(card); return { it, cv, card };
    });
    function draw() {
      const W = cards[0].card.clientWidth - 20; if (W <= 0) return;
      const sc = W / maxW, H = Math.ceil(maxH * sc) + 20, dpr = window.devicePixelRatio || 1;
      for (const c of cards) {
        c.cv.width = W * dpr; c.cv.height = H * dpr; c.cv.style.width = W + 'px'; c.cv.style.height = H + 'px';
        const ctx = c.cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        let x = 0;
        const paint = (k, tok) => {
          const a = dec[k]; ctx.fillStyle = DS.css(tok);
          for (let i = 0; i < a.length; i += 2) ctx.fillRect(x + a[i] * sc, a[i + 1] * sc, Math.max(1, sc), Math.max(1, sc));
          x += (S[k].w + 5) * sc;
        };
        c.it.pre.forEach((k) => paint(k, '--c2'));
        paint(c.it.post, '--c1');
        ctx.fillStyle = DS.css('--ink'); ctx.fillRect(0, H - 7, 10 * sc, 3);
        ctx.font = '11px Inter, system-ui, sans-serif'; ctx.fillStyle = DS.css('--muted'); ctx.textBaseline = 'bottom';
        ctx.fillText('1 mm', 10 * sc + 6, H - 2);
      }
    }
    let rafId = 0;
    const onResize = () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; draw(); }); };
    new ResizeObserver(onResize).observe(grid); DS.on('theme', draw);
    parent.append(h('div', { class: 'legend' },
      h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
        h('span', { class: 'sw', style: 'background:var(--c2)' }), 'PRE pieces (biopsy, before)'),
      h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
        h('span', { class: 'sw', style: 'background:var(--c1)' }), 'POST section (resection, after)')));
  };
})();
