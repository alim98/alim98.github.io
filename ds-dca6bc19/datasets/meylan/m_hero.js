/* Meylan course: the home-page hero figure (a real tissue section, drawn dark). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h;
  const M = DS.meylan;

  M.heroPlot = async function (el) {
    let d;
    try { d = await M.tissue('P28_POST'); } catch (e) { return; }
    const cv = h('canvas', { role: 'img', 'aria-label': 'Cells of a treated glioblastoma section, coloured by cell type' });
    el.append(cv, h('div', { class: 'lab' }, 'P28 after treatment · ' + DS.fmt.int(d.n) + ' cells · colour = cell type'));
    const PAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#9085e9', '#2a3850'];
    function draw() {
      const W = el.clientWidth, H = Math.max(260, Math.round(W * 0.62));
      if (!W) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0a111e'; ctx.fillRect(0, 0, W, H);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < d.n; i++) {
        if (d.x[i] < x0) x0 = d.x[i]; if (d.x[i] > x1) x1 = d.x[i];
        if (d.y[i] < y0) y0 = d.y[i]; if (d.y[i] > y1) y1 = d.y[i];
      }
      const sc = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.98;
      const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
      const order = [5, 0, 4, 3, 1, 2]; /* draw the rare, bright populations last */
      for (const c of order) {
        ctx.fillStyle = PAL[c]; ctx.globalAlpha = c === 0 ? 0.75 : 0.95;
        for (let i = 0; i < d.n; i++) {
          if (M.compOf[d.t2[i]] !== c) continue;
          ctx.fillRect(ox + (d.x[i] - x0) * sc, oy + (d.y[i] - y0) * sc, 1.4, 1.4);
        }
      }
      ctx.globalAlpha = 1;
      const bar = 500 * sc;
      ctx.fillStyle = '#c7d2e3'; ctx.fillRect(W - bar - 16, H - 16, bar, 2.5);
      ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('500 µm', W - 16, H - 20);
    }
    let rafId = 0;
    const onResize = () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; draw(); }); };
    new ResizeObserver(onResize).observe(el);
    draw();
  };
})();
