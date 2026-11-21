/* Development aid, not part of the course: load index.html?selftest=1#<course>-<n> and this clicks every
   exercise on the page, then writes a pass/fail banner that a screenshot can read. */
(function () {
  'use strict';
  if (location.search.indexOf('selftest') < 0) return;
  const errors = [];
  window.addEventListener('error', (e) => errors.push('error: ' + (e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (el) => { if (el && !el.disabled) { el.click(); return 1; } return 0; };

  function banner(text, ok) {
    let b = document.getElementById('selftest-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'selftest-banner';
      b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:999;padding:10px 16px;font:600 14px Inter,'
        + 'system-ui,sans-serif;white-space:pre-wrap';
      document.body.appendChild(b);
    }
    b.style.background = ok ? '#0f7b3e' : '#b42318';
    b.style.color = '#fff';
    b.textContent = text;
  }

  /* headless Firefox screenshots at network idle, so keep one request in flight until the run finishes */
  let ping = 0;
  const keepAlive = setInterval(() => { fetch('assets/selftest.js?ping=' + (++ping)).catch(() => {}); }, 150);

  async function run() {
    await sleep(1200);                      /* let the lesson build and its data load */
    const log = [];
    const exs = Array.from(document.querySelectorAll('.ex'));
    for (const ex of exs) {
      const id = ex.id;
      try {
        /* multiple choice and predict-choice: pick the first two options, then check */
        const opts = ex.querySelectorAll('.opt');
        if (opts.length) { click(opts[0]); if (ex.querySelector('.opt.multi')) click(opts[1]); }
        /* sliders: move them */
        ex.querySelectorAll('input[type="range"]').forEach((r) => {
          r.value = String(Math.round((Number(r.min) + Number(r.max)) / 2));
          r.dispatchEvent(new Event('input', { bubbles: true }));
        });
        /* numeric answers: a deliberately wrong value exercises the same path */
        ex.querySelectorAll('input[type="number"]').forEach((n) => { n.value = '3'; });
        /* match: choose the first real option in every select */
        ex.querySelectorAll('.match-row select').forEach((sel) => {
          if (sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        /* order: move one row */
        const mv = ex.querySelector('.order .mv:not([disabled])');
        if (mv) click(mv);
        /* flashcards: flip and mark */
        const card = ex.querySelector('.fcard');
        if (card) { click(card); }
        await sleep(60);
        let pressed = 0;
        ex.querySelectorAll('.btn').forEach((b) => { pressed += click(b); });
        await sleep(240);
        const st = ex.querySelector('.status');
        log.push(`${id}: ${pressed} button(s), status "${st ? st.textContent : '?'}"`);
      } catch (e) { errors.push(id + ': ' + e.message); }
    }
    /* lesson 5 asks for clicks on the tissue canvas */
    const canvases = Array.from(document.querySelectorAll('.plot2d.clickable canvas'));
    for (const cv of canvases) {
      const r = cv.getBoundingClientRect();
      for (const [fx, fy] of [[0.5, 0.5], [0.35, 0.6], [0.65, 0.4]]) {
        const o = { bubbles: true, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy,
          pointerType: 'mouse', pointerId: 1 };
        cv.dispatchEvent(new PointerEvent('pointerdown', o));
        cv.dispatchEvent(new PointerEvent('pointerup', o));
        await sleep(120);
      }
    }
    await sleep(400);
    const empty = Array.from(document.querySelectorAll('.readout .v')).filter((n) => !n.textContent.trim()).length;
    const ok = errors.length === 0;
    banner((ok ? 'SELFTEST PASS' : 'SELFTEST FAIL') + ' · ' + exs.length + ' exercises · '
      + canvases.length + ' clickable plot(s) · ' + empty + ' empty readouts'
      + (errors.length ? '\n' + errors.slice(0, 6).join('\n') : '') + '\n' + log.join(' | '), ok);
    document.title = (ok ? 'PASS ' : 'FAIL ') + document.title;
    clearInterval(keepAlive);
    /* report through the dev server's request log, which survives the browser being closed */
    const line = (ok ? 'PASS' : 'FAIL') + '|' + location.hash + '|ex=' + exs.length + '|plots=' + canvases.length
      + '|emptyReadouts=' + empty + (errors.length ? '|' + errors.slice(0, 4).join('~') : '');
    fetch('/__selftest__/' + encodeURIComponent(line)).catch(() => {});
  }
  window.addEventListener('load', () => { run(); });
})();
