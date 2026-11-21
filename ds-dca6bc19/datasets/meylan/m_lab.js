/* Meylan course, part 4: the molecule lab (real transcripts, nucleus-expansion slider). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;
  const T1_TO_COMP = { 'Tumor cells': 0, 'Macrophages/Monocytes': 1, Neutrophils: 1, 'Dendritic cells': 1,
    'T cells': 2, 'NK cells': 2, 'B cells': 3, 'Plasma cells': 3, Vasculature: 4, 'Stromal cells': 4 };

  M.moleculeLab = async function (parent, o) {
    o = o || {};
    const w = await M.window(), C = w.cells, nT = w.tx.length;
    const comp = C.t1.map((t) => (T1_TO_COMP[t] == null ? 5 : T1_TO_COMP[t]));
    const negK = w.kind.indexOf('negative_control_probe');
    const tx = Float32Array.from(w.tx), ty = Float32Array.from(w.ty);
    let d = o.d != null ? o.d : 5, gene = o.gene || 'GFAP';
    const names = ['GFAP', 'SOX2', 'CD163', 'CD3E', 'CD2', 'TCR probe', 'HSV-1']
      .filter((g) => w.feats.indexOf(g) >= 0).concat(['negative control']);
    const isGene = (i) => (gene === 'negative control' ? w.tk[i] === negK : w.feats[w.tf[i]] === gene);
    const inCell = (i, dd) => w.tc[i] >= 0 && w.td[i] <= dd + 1e-6;

    const wrap = h('div', { class: 'plot-wrap' }); parent.append(wrap);
    const out = h('span', { class: 'big-num' }, d + ' µm');
    const slider = h('input', { type: 'range', id: 'lab-d', min: 0, max: 5, step: 0.5, value: d,
      'aria-label': 'Nucleus expansion in micrometres' });
    wrap.append(h('div', { class: 'controls' },
      h('label', { for: 'lab-d', style: 'flex:1;min-width:230px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center' },
        'Nucleus expansion', slider), out,
      DS.select('lab-g', names.map((g) => [g, g]), gene, (g) => { gene = g; update(); }, 'Follow')));
    const box = h('div'); wrap.append(box);
    const readout = h('div', { class: 'readout' }); wrap.append(readout);
    const key = h('div', { class: 'legend' }); wrap.append(key);
    M.COMP.forEach((c) => key.append(h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
      h('span', { class: 'sw', style: `background:var(${c.color})` }), c.label)));
    key.append(h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
      h('span', { class: 'sw', style: 'background:var(--muted);border-radius:50%' }), 'molecule in no cell'),
      h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' },
        h('span', { class: 'sw', style: 'background:var(--ink);border-radius:50%' }), 'the gene you follow'));

    const plot = new DS.Plot2D(box, {
      height: (W) => Math.min(600, W), pad: 10, label: 'Every RNA molecule in a 110 micrometre square of tissue',
      under: (ctx, p) => {
        for (let c = 0; c < C.x.length; c++) {
          const X = p.sx(C.x[c]), Y = p.sy(C.y[c]), r = C.r[c] * p.view.s, tok = DS.css(M.COMP[comp[c]].color);
          ctx.globalAlpha = 0.3; ctx.fillStyle = tok;
          ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 0.85; ctx.strokeStyle = tok; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(X, Y, (C.r[c] + d) * p.view.s, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      },
      overlay: (ctx, p) => DS.scaleBar(ctx, p),
      tip: (i) => `<b>${w.tk[i] === negK ? 'negative control probe' : w.feats[w.tf[i]]}</b><br>`
        + (inCell(i, d) ? 'counted in a ' + C.t1[w.tc[i]].toLowerCase().replace('tumor', 'tumour') + ' cell'
          : 'counted in no cell at ' + d + ' µm')
        + `<br>${w.td[i]} µm from the nearest nucleus`,
    });
    plot.setPoints(tx, ty, [0, w.size, 0, w.size]);

    function update() {
      out.textContent = d + ' µm';
      const groups = M.COMP.map(() => []), none = [], hi = [], hiBy = M.COMP.map(() => 0);
      let nIn = 0, hiNone = 0;
      for (let i = 0; i < nT; i++) {
        const a = inCell(i, d); if (a) nIn++;
        if (isGene(i)) { hi.push(i); if (a) hiBy[comp[w.tc[i]]]++; else hiNone++; continue; }
        if (a) groups[comp[w.tc[i]]].push(i); else none.push(i);
      }
      const L = [{ idx: Int32Array.from(none), color: M.col('--muted'), r: 0.9, scale: false, alpha: 0.65 }];
      groups.forEach((g, k) => L.push({ idx: Int32Array.from(g), color: M.col(M.COMP[k].color), r: 0.9,
        scale: false, alpha: 0.9 }));
      L.push({ idx: Int32Array.from(hi), color: M.col('--ink'), r: 2.6, scale: false });
      plot.setLayers(L);
      readout.innerHTML = '';
      const add = (k, v) => readout.append(h('div', null, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)));
      add('of all molecules land in a cell', F.pct(nIn / nT, 1));
      add(gene + ' molecules here', F.int(hi.length));
      add(gene + ' in tumour cells', F.int(hiBy[0]));
      add(gene + ' in myeloid cells', F.int(hiBy[1]));
      add(gene + ' in T / NK cells', F.int(hiBy[2]));
      add(gene + ' in no cell', F.int(hiNone));
      if (o.onChange) o.onChange({ d, gene, fracIn: nIn / nT, hiBy, hiNone, hiTotal: hi.length });
    }
    slider.addEventListener('input', () => { d = parseFloat(slider.value); update(); });
    update();
    wrap.append(h('div', { class: 'caption', html:
      `Real molecules, not a drawing: every RNA spot decoded in a 110 × 110 µm square of ${M.secLabel(w.section)} `
      + `(${F.int(w.n)} molecules passing the quality filter, ${C.x.length} cells). Filled discs are nuclei at their `
      + 'measured size; the dashed ring is how far each cell is allowed to reach. Rings can overlap in this drawing, '
      + 'while the instrument stops the expansion where two cells meet. Cell colours are the authors’ labels.' }));

    return {
      w, comp,
      fracIn(dd) { let a = 0; for (let i = 0; i < nT; i++) if (inCell(i, dd)) a++; return a / nT; },
      countIn(g, compIdx, dd) {
        let a = 0;
        for (let i = 0; i < nT; i++) if (w.feats[w.tf[i]] === g && inCell(i, dd) && comp[w.tc[i]] === compIdx) a++;
        return a;
      },
      nNegative() { let a = 0; for (let i = 0; i < nT; i++) if (w.tk[i] === negK) a++; return a; },
      nFiltered: w.n_raw - w.n,
    };
  };

  /* small schematic of the trial: one injection, two tissue pieces, a long gap between them */
  M.trialDiagram = function (parent, stats) {
    const W = 640, H = 196;
    const s = DS.s, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img',
      'aria-label': 'Trial design: a biopsy before injection, then one virus injection, then a resection weeks to months later',
      style: 'max-width:640px;display:block;overflow:visible' });
    svg.append(s('line', { x1: 40, x2: W - 30, y1: 118, y2: 118, stroke: 'var(--grid)', 'stroke-width': 2 }));
    const stop = (x, label, sub, tok, r) => {
      svg.append(s('circle', { cx: x, cy: 118, r: r || 7, fill: `var(${tok})`, stroke: 'var(--bg)', 'stroke-width': 2 }));
      svg.append(s('text', { x, y: 96, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 650,
        style: 'fill:var(--ink)' }, label));
      (sub || []).forEach((t, i) => svg.append(s('text', { x, y: 140 + i * 15, 'text-anchor': 'middle',
        'font-size': 11.5, style: 'fill:var(--muted)' }, t)));
    };
    stop(110, 'Biopsy + injection', ['tissue taken, then', 'virus injected: day 0'], '--c2');
    stop(430, 'Second surgery', ['tissue taken again', '15 to 801 days later'], '--c1');
    svg.append(s('text', { x: 270, y: 112, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:var(--muted)' },
      'one injection, then standard care'));
    svg.append(s('text', { x: 40, y: 34, 'font-size': 13, 'font-weight': 700, style: 'fill:var(--ink)' },
      'What a patient contributes: two pieces of tissue'));
    svg.append(s('text', { x: 40, y: 56, 'font-size': 12, style: 'fill:var(--ink-2)' },
      'PRE = a small biopsy core · POST = a whole resection or an autopsy'));
    svg.append(s('text', { x: 40, y: 74, 'font-size': 12, style: 'fill:var(--ink-2)' },
      '8 patients × 2 pieces = 16 samples, 2.4 million cells'));
    parent.append(h('div', { class: 'scroll-x' }, svg));
  };
})();
