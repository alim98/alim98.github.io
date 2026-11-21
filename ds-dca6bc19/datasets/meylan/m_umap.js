/* Meylan course, part 2: the UMAP explorer. */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;

  M.umapView = async function (parent, o) {
    o = o || {};
    const wrap = h('div', { class: 'plot-wrap' });
    const ctl = h('div', { class: 'controls' }), box = h('div'), keyBox = h('div');
    wrap.append(ctl, box, keyBox); parent.append(wrap);
    const d = await M.umap(), n = d.n;
    let mode = o.mode || 'comp', gene = o.gene || 'CD3E', focus = null, labels = o.labels !== false, cents = [];
    const med = (l, arr) => DS.median(Array.from(l, (i) => arr[i]));

    const plot = new DS.Plot2D(box, {
      height: (w) => Math.min(540, Math.max(330, w * 0.6)), flipY: true, pointPx: 1.5,
      label: 'UMAP of 32,000 cells from 16 samples',
      tip: (i) => `<b>${M.typeName(d.t2[i])}</b>${d.tt[i] < 10 ? '<br>' + M.TCELLS[d.tt[i]] : ''}`
        + `<br>${d.samples[d.sample[i]].replace('_', ' ')} · ${d.total[i]} molecules`
        + (mode === 'gene' ? `<br>${gene}: ${d.expr[gene][i]}` : ''),
      overlay: (ctx, p) => {
        if (!labels || !cents.length) return;
        ctx.font = '600 11.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        for (const c of cents) {
          if (!c) continue;
          const X = p.sx(c.x), Y = p.sy(c.y);
          ctx.strokeStyle = DS.css('--plot'); ctx.lineWidth = 3.5; ctx.strokeText(c.label, X, Y);
          ctx.fillStyle = DS.css('--ink'); ctx.fillText(c.label, X, Y);
        }
      },
    });
    plot.setPoints(d.x, d.y);

    function render() {
      keyBox.innerHTML = '';
      if (mode === 'gene') {
        cents = []; plot.setLayers(M.geneLayers(d.expr[gene], n)); M.geneKey(keyBox, gene); return;
      }
      if (mode.slice(0, 6) === 'score:') {
        cents = [];
        const v = d.scores[mode.slice(6)];
        const sorted = Array.from(v).sort((a, b) => a - b);
        const hi = sorted[Math.floor(sorted.length * 0.99)] || 1;
        const bins = [[], [], [], [], [], []];
        for (let i = 0; i < n; i++) { const z = v[i] / hi; bins[v[i] <= 0 ? 0 : Math.min(5, 1 + Math.floor(z * 5))].push(i); }
        plot.setLayers(bins.map((l, k) => ({ idx: Int32Array.from(l), color: M.col(k ? M.RAMP[k - 1] : '--null'),
          alpha: k ? 1 : 0.55 })));
        M.scoreKey(keyBox, 'authors’ ' + mode.slice(6).toUpperCase() + ' module score');
        return;
      }
      const cat = M.categorical(d, mode);
      if (mode === 'comp') {
        const t = M.categorical(d, 'type');
        cents = t.lists.map((l, k) => (l.length < 150 ? null : { x: med(l, d.x), y: med(l, d.y), label: t.cats[k].label }));
      } else if (mode === 'state') {
        cents = cat.lists.map((l, k) => (l.length < 150 ? null : { x: med(l, d.x), y: med(l, d.y), label: cat.cats[k].label }));
      } else cents = [];
      plot.setLayers(M.catLayers(cat.lists, cat.cats, focus, cat.nullIdx));
      DS.legend(keyBox, cat.cats.map((c, k) => ({ key: k, label: c.label, color: M.col(c.color),
        count: F.int(cat.lists[k].length) })), (fk) => {
        focus = fk; plot.setLayers(M.catLayers(cat.lists, cat.cats, fk, cat.nullIdx));
      });
    }

    if (o.controls !== false) {
      const modes = o.modes || [['comp', 'Cell type'], ['state', 'Tumour state'], ['tcell', 'T-cell state'],
        ['patient', 'Patient'], ['time', 'Before / after'], ['gene', 'Gene']];
      ctl.append(DS.seg(modes, mode, (m) => { mode = m; focus = null; render(); }));
      ctl.append(DS.select('umg-' + (o.id || 'a'), d.genes.map((g) => [g, g]), gene,
        (g) => { gene = g; mode = 'gene'; render(); }, 'Gene'));
      if (o.scores) ctl.append(DS.select('ums-' + (o.id || 'a'),
        [['', 'State score…']].concat(['ac', 'opc', 'npc1', 'npc2', 'mes1', 'mes2'].map((k) => ['score:' + k, k.toUpperCase() + ' score'])),
        '', (v) => { if (v) { mode = v; render(); } }));
      ctl.append(h('label', null, h('input', { type: 'checkbox', checked: labels ? true : null,
        onchange: (e) => { labels = e.target.checked; plot.draw(); } }), 'Labels'));
    }
    render();
    wrap.append(h('div', { class: 'caption', html: o.caption
      || 'The authors’ own UMAP. 2,000 cells drawn at random from each of the 16 samples (32,000 of 2.4 million), '
      + 'so the small PRE samples are over-represented on purpose. Drag to pan, + and − to zoom, click a legend '
      + 'entry to grey out everything else.' }));
    return {
      plot, d,
      setMode(m, g) { mode = m; if (g) gene = g; focus = null; render(); },
      highlight(pred, label) {
        labels = false; cents = []; keyBox.innerHTML = '';
        const on = [], off = [];
        for (let i = 0; i < n; i++) (pred(i) ? on : off).push(i);
        plot.setLayers([{ idx: Int32Array.from(off), color: M.col('--null'), alpha: 0.5 },
          { idx: Int32Array.from(on), color: M.col('--c8'), r: 2.4 }]);
        keyBox.append(h('div', { class: 'legend' },
          h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
            h('span', { class: 'sw', style: 'background:var(--c8)' }), label + ' (' + F.int(on.length) + ' cells)'),
          h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
            h('span', { class: 'sw', style: 'background:var(--null)' }), 'all other cells')));
      },
    };
  };
})();
