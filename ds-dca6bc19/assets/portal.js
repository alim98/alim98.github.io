/* Dataset School engine: router, progress, plots and practice widgets.
   Courses register themselves in DS.courses[id] (see datasets/<id>/course.js). No build step, no dependencies. */
(function () {
  'use strict';
  const DS = (window.DS = window.DS || {});
  DS.courses = DS.courses || {};
  DS.labnotes = DS.labnotes || {};

  /* ------------------------------------------------------------ DOM + format helpers */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = DS.markup(v);
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'hidden') el.hidden = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(svgNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    for (const kid of kids.flat(Infinity)) if (kid != null) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  DS.h = h; DS.s = s;
  /* [[key|label]] -> glossary term; `GENE` -> gene chip */
  DS.markup = (str) => String(str)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span class="term" tabindex="0" data-k="$1">$2</span>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="term" tabindex="0" data-k="$1">$1</span>')
    .replace(/`([^`]+)`/g, '<span class="gene">$1</span>');
  /* wrap bare text runs in <p> so every paragraph is an element and gets spacing */
  const BLOCK = /<(p|ul|ol|h[1-6]|div|table)\b/i;
  DS.prose = (html, cls) => {
    let src = String(html).trim(), out = '';
    while (src) {
      const m = src.match(BLOCK);
      if (!m) { out += '<p>' + src + '</p>'; break; }
      const pre = src.slice(0, m.index).trim();
      if (pre) out += '<p>' + pre + '</p>';
      const close = '</' + m[1].toLowerCase() + '>';
      const end = src.toLowerCase().indexOf(close, m.index);
      if (end < 0) { out += src.slice(m.index); break; }
      out += src.slice(m.index, end + close.length);
      src = src.slice(end + close.length).trim();
    }
    return h('div', { class: 'prose' + (cls ? ' ' + cls : ''), html: out });
  };
  const nf = new Intl.NumberFormat('en-US');
  DS.fmt = {
    int: (n) => nf.format(Math.round(n)),
    pct: (x, d = 1) => (x * 100).toFixed(d) + '%',
    num: (x, d = 2) => Number(x).toFixed(d),
    sig: (x) => (x >= 100 ? nf.format(Math.round(x)) : x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2)),
  };
  DS.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  DS.shuffle = (arr, seed) => {
    const a = arr.slice(); let x = seed || 7;
    for (let i = a.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  DS.median = (a) => { const b = a.slice().sort((p, q) => p - q); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

  /* ------------------------------------------------------------ storage + progress */
  const KEY = 'dsschool.v1';
  let mem = {};
  try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw) || {}; } catch (e) { mem = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* storage blocked: keep in memory */ } }
  DS.progress = {
    get(course, id) { return ((mem[course] || {}).ex || {})[id]; },
    record(course, id, ok) {
      const c = (mem[course] = mem[course] || {}); c.ex = c.ex || {};
      const r = c.ex[id] || { tries: 0 };
      r.tries += 1; if (r.first === undefined) r.first = ok; r.ok = ok; r.at = Date.now();
      c.ex[id] = r; save(); DS.emit('progress');
      return r;
    },
    setLessonEx(course, li, ids) { const c = (mem[course] = mem[course] || {}); c.lessons = c.lessons || {}; c.lessons[li] = ids; save(); },
    lessonState(course, li) {
      const c = mem[course] || {}; const ids = (c.lessons || {})[li];
      if (!ids) return { known: false, done: 0, total: 0, firstOk: 0 };
      const ex = c.ex || {};
      return { known: true, total: ids.length, done: ids.filter((i) => ex[i]).length, firstOk: ids.filter((i) => ex[i] && ex[i].first === true).length };
    },
    flash(course) { const c = (mem[course] = mem[course] || {}); c.flash = c.flash || {}; return c.flash; },
    saveFlash() { save(); },
    reset(course) { delete mem[course]; save(); DS.emit('progress'); },
  };
  const subs = {};
  DS.on = (ev, fn) => { (subs[ev] = subs[ev] || new Set()).add(fn); return () => subs[ev].delete(fn); };
  DS.emit = (ev, ...a) => (subs[ev] || []).forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } });

  /* ------------------------------------------------------------ data */
  const cache = {};
  DS.json = (url) => cache[url] || (cache[url] = fetch(url).then((r) => { if (!r.ok) throw new Error('Could not load ' + url + ' (' + r.status + ')'); return r.json(); }));
  DS.b64 = (str, T) => {
    const bin = atob(str); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return !T || T === Uint8Array ? u : new T(u.buffer);
  };

  /* ------------------------------------------------------------ theme */
  const themeMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (themeMQ && themeMQ.addEventListener) themeMQ.addEventListener('change', () => DS.emit('theme'));
  new MutationObserver(() => DS.emit('theme')).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  try { const t = localStorage.getItem('dsschool.theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { }
  /* the page is light unless the viewer asked for dark, so the toggle reads the attribute only */
  DS.isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  DS.toggleTheme = () => {
    const next = DS.isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('dsschool.theme', next); } catch (e) { }
  };

  /* live plots are redrawn on theme change and dropped on navigation */
  const live = new Set();
  DS.on('theme', () => live.forEach((p) => p.draw && p.draw()));

  /* ------------------------------------------------------------ Plot2D: canvas scatter with pan/zoom/hover */
  class Plot2D {
    constructor(parent, o = {}) {
      this.o = Object.assign({ height: 440, flipY: false, pad: 16, pointPx: 2, zoom: true, minR: 0.8, maxR: 7 }, o);
      this.el = h('div', { class: 'plot2d' + (o.clickable ? ' clickable' : '') });
      this.cv = h('canvas', { role: 'img', 'aria-label': o.label || 'Scatter plot of cells' });
      this.tip = h('div', { class: 'tip', hidden: true });
      this.el.append(this.cv, this.tip);
      if (this.o.zoom) this.el.append(h('div', { class: 'zoombar' },
        h('button', { title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => this.zoomBy(1.7) }, '+'),
        h('button', { title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => this.zoomBy(1 / 1.7) }, '−'),
        h('button', { title: 'Reset view', 'aria-label': 'Reset view', onclick: () => this.reset() }, '⟲')));
      parent.append(this.el);
      this.layers = []; this.n = 0; this.k = 1;
      let rr = 0;
      this.ro = new ResizeObserver(() => { if (!rr) rr = requestAnimationFrame(() => { rr = 0; this.resize(); }); });
      this.ro.observe(this.el);
      this.bind(); live.add(this);
    }
    setPoints(x, y, bounds) {
      this.x = x; this.y = y; this.n = x.length; this.grid = null;
      if (bounds) this.b = bounds;
      else { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (let i = 0; i < this.n; i++) { const X = x[i], Y = y[i]; if (X < a) a = X; if (X > b) b = X; if (Y < c) c = Y; if (Y > d) d = Y; } this.b = [a, b, c, d]; }
      this.reset(false);
    }
    resize() {
      const w = this.el.clientWidth; if (!w) return;
      const hgt = typeof this.o.height === 'function' ? this.o.height(w) : this.o.height;
      const dpr = window.devicePixelRatio || 1;
      this.W = w; this.H = hgt; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(hgt * dpr); this.cv.style.height = hgt + 'px';
      if (!this.view || !this.userMoved) this.fit(); this.draw();
    }
    fit() {
      if (!this.b || !this.W) return;
      const [a, b, c, d] = this.b, p = this.o.pad;
      const s0 = Math.min((this.W - 2 * p) / Math.max(b - a, 1e-9), (this.H - 2 * p) / Math.max(d - c, 1e-9));
      this.base = s0; this.view = { cx: (a + b) / 2, cy: (c + d) / 2, s: s0 }; this.k = 1;
    }
    reset(draw = true) { this.userMoved = false; this.fit(); if (draw) this.draw(); }
    zoomBy(f, px, py) {
      if (!this.view) return; const v = this.view;
      if (px != null) { const [X, Y] = this.inv(px, py); v.s *= f; const [X2, Y2] = this.inv(px, py); v.cx += X - X2; v.cy += Y - Y2; } else v.s *= f;
      this.k = v.s / this.base; this.userMoved = true; this.draw();
    }
    sx(x) { return (x - this.view.cx) * this.view.s + this.W / 2; }
    sy(y) { return this.o.flipY ? this.H / 2 - (y - this.view.cy) * this.view.s : (y - this.view.cy) * this.view.s + this.H / 2; }
    inv(px, py) { const v = this.view; return [(px - this.W / 2) / v.s + v.cx, this.o.flipY ? v.cy - (py - this.H / 2) / v.s : (py - this.H / 2) / v.s + v.cy]; }
    radius() {
      if (this.o.pointUnits) return Math.max(this.o.minR, Math.min(this.o.maxR, this.o.pointUnits * this.view.s));
      return Math.max(this.o.minR, Math.min(this.o.maxR, this.o.pointPx * Math.sqrt(this.k)));
    }
    setLayers(layers) { this.layers = layers; this.grid = null; this.draw(); }
    draw() {
      if (!this.view || !this.W) return;
      const ctx = this.cv.getContext('2d'); const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = this.o.bg ? this.o.bg() : DS.css('--plot'); ctx.fillRect(0, 0, this.W, this.H);
      if (this.o.under) this.o.under(ctx, this);
      const R = this.radius(); const W = this.W, H = this.H; const x = this.x, y = this.y;
      for (const L of this.layers) {
        const r = L.r != null ? L.r * (L.scale === false ? 1 : R / this.radius()) : R; const idx = L.idx;
        ctx.globalAlpha = L.alpha != null ? L.alpha : 1; ctx.fillStyle = typeof L.color === 'function' ? L.color() : L.color;
        const m = idx ? idx.length : this.n; const circle = r >= 2.2;
        if (circle) ctx.beginPath();
        for (let j = 0; j < m; j++) {
          const i = idx ? idx[j] : j; const px = this.sx(x[i]), py = this.sy(y[i]);
          if (px < -r || py < -r || px > W + r || py > H + r) continue;
          if (circle) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 6.2832); } else ctx.fillRect(px - r, py - r, 2 * r, 2 * r);
        }
        if (circle) ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (this.o.overlay) this.o.overlay(ctx, this);
    }
    buildGrid() {
      const hov = new Uint8Array(this.n);
      for (const L of this.layers) { if (L.hover === false) continue; const idx = L.idx; if (!idx) hov.fill(1); else for (let j = 0; j < idx.length; j++) hov[idx[j]] = 1; }
      const [a, b, c, d] = this.b; const G = 96; const gx = (b - a) / G || 1, gy = (d - c) / G || 1;
      const cells = new Map();
      for (let i = 0; i < this.n; i++) {
        if (!hov[i]) continue; const k = Math.min(G - 1, Math.floor((this.x[i] - a) / gx)) * 1000 + Math.min(G - 1, Math.floor((this.y[i] - c) / gy));
        let arr = cells.get(k); if (!arr) cells.set(k, (arr = [])); arr.push(i);
      }
      this.grid = { a, c, gx, gy, G, cells };
    }
    nearest(px, py, maxPx = 8) {
      if (!this.n || !this.o.tip) return -1; if (!this.grid) this.buildGrid();
      const g = this.grid; const [X, Y] = this.inv(px, py); const rd = maxPx / this.view.s;
      const i0 = Math.floor((X - rd - g.a) / g.gx), i1 = Math.floor((X + rd - g.a) / g.gx), j0 = Math.floor((Y - rd - g.c) / g.gy), j1 = Math.floor((Y + rd - g.c) / g.gy);
      let best = -1, bd = rd * rd;
      for (let i = Math.max(0, i0); i <= Math.min(g.G - 1, i1); i++) for (let j = Math.max(0, j0); j <= Math.min(g.G - 1, j1); j++) {
        const arr = g.cells.get(i * 1000 + j); if (!arr) continue;
        for (const k of arr) { const dx = this.x[k] - X, dy = this.y[k] - Y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = k; } }
      }
      return best;
    }
    bind() {
      let down = null, moved = false, raf = 0;
      const pos = (e) => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      this.cv.addEventListener('pointerdown', (e) => {
        down = pos(e); moved = false;
        if (e.pointerType === 'mouse') { try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ } }
      });
      this.cv.addEventListener('pointermove', (e) => {
        const [px, py] = pos(e);
        if (down && this.o.zoom) {
          const dx = px - down[0], dy = py - down[1];
          if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
          if (moved) { this.view.cx -= dx / this.view.s; this.view.cy += (this.o.flipY ? dy : -dy) / this.view.s; down = [px, py]; this.userMoved = true; this.tip.hidden = true; if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.draw(); }); }
          return;
        }
        if (!this.o.tip || e.pointerType !== 'mouse') return;
        const i = this.nearest(px, py);
        if (i < 0) { this.tip.hidden = true; return; }
        const html = this.o.tip(i); if (!html) { this.tip.hidden = true; return; }
        this.tip.innerHTML = html; this.tip.hidden = false;
        const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
        this.tip.style.left = Math.min(this.W - tw - 6, px + 12) + 'px'; this.tip.style.top = Math.max(6, py - th - 10) + 'px';
      });
      const up = (e) => {
        if (down && !moved && this.o.onClick) { const [px, py] = pos(e); const [X, Y] = this.inv(px, py); this.o.onClick(X, Y, px, py); }
        else if (down && !moved && this.o.tip && e.pointerType !== 'mouse') {
          const [px, py] = pos(e); const i = this.nearest(px, py, 14); const html = i >= 0 && this.o.tip(i);
          if (html) { this.tip.innerHTML = html; this.tip.hidden = false; this.tip.style.left = Math.min(this.W - this.tip.offsetWidth - 6, px + 10) + 'px'; this.tip.style.top = Math.max(6, py - this.tip.offsetHeight - 12) + 'px'; } else this.tip.hidden = true;
        }
        down = null;
      };
      this.cv.addEventListener('pointerup', up);
      this.cv.addEventListener('pointerleave', () => { if (!down) this.tip.hidden = true; });
      this.cv.addEventListener('dblclick', (e) => { if (!this.o.zoom || this.o.onClick) return; const [px, py] = pos(e); this.zoomBy(1.8, px, py); });
    }
  }
  DS.Plot2D = Plot2D;

  /* scale bar for plots in micrometres */
  DS.scaleBar = (ctx, p, unitLabel = 'µm') => {
    const target = p.W * 0.18 / p.view.s; const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    let L = nice[0]; for (const n of nice) if (n <= target) L = n;
    const px = L * p.view.s; const x0 = 16, y0 = p.H - 18;
    ctx.fillStyle = DS.css('--ink'); ctx.fillRect(x0, y0, px, 3);
    ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textBaseline = 'bottom';
    ctx.fillText(L >= 1000 ? L / 1000 + ' mm' : L + ' ' + unitLabel, x0, y0 - 4);
  };

  /* legend with focus toggling: items [{key,label,color,count}] */
  DS.legend = (parent, items, onFocus) => {
    const el = h('div', { class: 'legend', role: 'group', 'aria-label': 'Legend: click an item to focus on it' });
    let focus = null;
    const btns = items.map((it) => {
      const b = h('button', { type: 'button', title: 'Show only ' + it.label }, h('span', { class: 'sw', style: 'background:' + (typeof it.color === 'function' ? it.color() : it.color) }), it.label, it.count != null ? h('span', { class: 'muted small tnum' }, ' ' + it.count) : null);
      b.addEventListener('click', () => { focus = focus === it.key ? null : it.key; paint(); onFocus && onFocus(focus); });
      return b;
    });
    function paint() { btns.forEach((b, i) => { b.classList.toggle('focus', focus === items[i].key); b.classList.toggle('off', focus != null && focus !== items[i].key); }); }
    el.append(...btns); parent.append(el);
    el.refresh = () => btns.forEach((b, i) => { b.firstChild.style.background = typeof items[i].color === 'function' ? items[i].color() : items[i].color; });
    el.clear = () => { focus = null; paint(); };
    return el;
  };
  DS.seg = (options, value, onChange) => {
    const el = h('div', { class: 'seg', role: 'group' });
    const bs = options.map(([v, label]) => h('button', { type: 'button', class: v === value ? 'on' : '', 'aria-pressed': v === value ? 'true' : 'false', onclick: () => { bs.forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); const b = bs[options.findIndex((o) => o[0] === v)]; b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); onChange(v); } }, label));
    el.append(...bs); return el;
  };
  DS.select = (id, options, value, onChange, label) => {
    const sel = h('select', { id, 'aria-label': label || id }, options.map(([v, t]) => h('option', { value: v, selected: v === value ? true : null }, t)));
    sel.addEventListener('change', () => onChange(sel.value));
    return label ? h('label', { for: id }, label, sel) : sel;
  };

  /* ------------------------------------------------------------ SVG charts */
  function svgBox(W, H, label) { return s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': label || 'chart', style: 'max-width:' + W + 'px;display:block;overflow:visible' }); }
  function spread(ys, minGap, lo, hi) {
    const o = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < o.length; k++) if (o[k].y - o[k - 1].y < minGap) o[k].y = o[k - 1].y + minGap;
    const over = o.length ? o[o.length - 1].y - hi : 0; if (over > 0) for (const e of o) e.y -= over;
    for (let k = o.length - 2; k >= 0; k--) if (o[k + 1].y - o[k].y < minGap) o[k].y = o[k + 1].y - minGap;
    const out = []; o.forEach((e) => (out[e.i] = Math.max(lo, e.y))); return out;
  }
  /* paired PRE/POST slope chart. rows [{label,a,b}] */
  DS.paired = (parent, rows, o = {}) => {
    const W = o.width || 520, H = o.height || 300, m = { l: 58, r: 150, t: 26, b: 30 };
    const vals = rows.flatMap((r) => [r.a, r.b]);
    const log = !!o.log; const f = log ? (v) => Math.log10(Math.max(v, o.floor || 1e-4)) : (v) => v;
    let lo = o.min != null ? f(o.min) : Math.min(...vals.map(f)), hi = o.max != null ? f(o.max) : Math.max(...vals.map(f));
    if (!log && o.min == null) lo = Math.min(0, lo);
    const pad = (hi - lo) * 0.06; lo -= log ? pad : 0; hi += pad;
    const Y = (v) => m.t + (H - m.t - m.b) * (1 - (f(v) - lo) / (hi - lo));
    const xa = m.l + 30, xb = W - m.r - 20;
    const svg = svgBox(W, H, o.label);
    const ticks = o.ticks || [];
    for (const t of ticks) { const y = Y(t); svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: 'var(--grid)', 'stroke-width': 1 }), s('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11 }, o.tickFmt ? o.tickFmt(t) : t)); }
    svg.append(s('text', { x: xa, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 650, style: 'fill:var(--ink)' }, o.aLabel || 'PRE'),
      s('text', { x: xb, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 650, style: 'fill:var(--ink)' }, o.bLabel || 'POST'));
    const ly = spread(rows.map((r) => Y(r.b)), 14, m.t - 6, H - m.b);
    rows.forEach((r, i) => {
      const up = r.b >= r.a; const col = up ? 'var(--c1)' : 'var(--c8)';
      const g = s('g', null, s('title', null, `${r.label}: ${o.fmt ? o.fmt(r.a) : r.a} → ${o.fmt ? o.fmt(r.b) : r.b}`));
      g.append(s('line', { x1: xa, x2: xb, y1: Y(r.a), y2: Y(r.b), stroke: col, 'stroke-width': r.hl ? 3 : 2, 'stroke-linecap': 'round', opacity: r.dim ? 0.35 : 1 }));
      for (const [x, v] of [[xa, r.a], [xb, r.b]]) g.append(s('circle', { cx: x, cy: Y(v), r: 4.5, fill: col, stroke: 'var(--bg)', 'stroke-width': 2 }));
      g.append(s('line', { x1: xb + 7, x2: xb + 16, y1: Y(r.b), y2: ly[i], stroke: 'var(--grid)' }));
      g.append(s('text', { x: xb + 20, y: ly[i] + 4, 'font-size': 12, style: 'fill:var(--ink)' }, r.label + '  ', s('tspan', { style: 'fill:var(--muted)' }, o.fmt ? o.fmt(r.b) : r.b)));
      svg.append(g);
    });
    parent.append(h('div', { class: 'scroll-x' }, svg));
    return svg;
  };
  /* 100% stacked horizontal bars. rows [{label, v:[fractions], sub}] cats [{label,color}] */
  DS.stack = (parent, rows, cats, o = {}) => {
    const W = o.width || 640, lw = o.labelW || 120, bh = 20, gap = 12, H = rows.length * (bh + gap) + 8;
    const svg = svgBox(W, H, o.label);
    rows.forEach((r, i) => {
      const y = 4 + i * (bh + gap); let x = lw; const tot = r.v.reduce((a, b) => a + b, 0) || 1;
      svg.append(s('text', { x: lw - 10, y: y + bh / 2 + 4, 'text-anchor': 'end', 'font-size': 12, style: 'fill:var(--ink)', 'font-weight': r.bold ? 700 : 500 }, r.label));
      r.v.forEach((v, k) => {
        const w = ((W - lw - 8) * v) / tot; if (w <= 0.2) return;
        const rect = s('rect', { x: x + 1, y, width: Math.max(0, w - 2), height: bh, rx: 3, fill: cats[k].color }, s('title', null, `${r.label} · ${cats[k].label}: ${DS.fmt.pct(v / tot)}`));
        svg.append(rect);
        if (w > 38) svg.append(s('text', { x: x + w / 2, y: y + bh / 2 + 4, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 650, style: 'fill:' + (cats[k].ink || '#fff'), 'pointer-events': 'none' }, Math.round((v / tot) * 100) + '%'));
        x += w;
      });
    });
    const wrap = h('div', { class: 'plot-wrap' });
    if (o.legend !== false) { const lg = h('div', { class: 'legend' }); cats.forEach((c) => lg.append(h('span', { style: 'display:inline-flex;align-items:center;gap:6px;padding:3px 8px' }, h('span', { class: 'sw', style: 'background:' + c.color }), c.label))); wrap.append(lg); }
    wrap.append(h('div', { class: 'scroll-x' }, svg)); parent.append(wrap); return svg;
  };
  /* horizontal bars. rows [{label, v, color, note}] */
  DS.hbars = (parent, rows, o = {}) => {
    const W = o.width || 600, lw = o.labelW || 110, bh = 16, gap = 10, H = rows.length * (bh + gap) + 6, vw = 70;
    const max = o.max || Math.max(...rows.map((r) => r.v)) || 1; const svg = svgBox(W, H, o.label);
    rows.forEach((r, i) => {
      const y = 3 + i * (bh + gap); const w = Math.max(1, ((W - lw - vw) * r.v) / max);
      svg.append(s('text', { x: lw - 10, y: y + bh / 2 + 4, 'text-anchor': 'end', 'font-size': 12, style: 'fill:var(--ink)' }, r.label));
      svg.append(s('path', { d: `M${lw},${y} h${w - 4} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h${-(w - 4)} z`, fill: r.color || 'var(--c1)' }, s('title', null, r.label + ': ' + (o.fmt ? o.fmt(r.v) : r.v))));
      svg.append(s('text', { x: lw + w + 6, y: y + bh / 2 + 4, 'font-size': 11.5, style: 'fill:var(--ink-2)' }, (o.fmt ? o.fmt(r.v) : r.v) + (r.note ? '  ' + r.note : '')));
    });
    parent.append(h('div', { class: 'scroll-x' }, svg)); return svg;
  };
  /* dot plot: groups x genes, size = fraction expressing, colour = mean scaled per gene */
  DS.dotplot = (parent, d, o = {}) => {
    const cw = 25, lw = o.labelW || 170, top = 74, rh = 24; const G = d.genes.length, R = d.groups.length;
    const W = lw + G * cw + 10, H = top + R * rh + 8; const svg = svgBox(W, H, o.label || 'Dot plot');
    const ramp = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6'].map((v) => 'var(' + v + ')');
    const colMax = d.genes.map((_, j) => Math.max(...d.mean.map((r) => r[j])));
    const colMin = d.genes.map((_, j) => Math.min(...d.mean.map((r) => r[j])));
    d.genes.forEach((g, j) => svg.append(s('text', { x: 0, y: 0, transform: `translate(${lw + j * cw + cw / 2 + 4},${top - 8}) rotate(-55)`, 'font-size': 11, 'font-family': 'var(--mono)', style: 'fill:var(--ink)' }, g)));
    d.groups.forEach((gname, i) => {
      const y = top + i * rh + rh / 2; const hl = o.highlight && o.highlight === gname;
      if (hl) svg.append(s('rect', { x: 0, y: y - rh / 2, width: W, height: rh, fill: 'var(--amber-soft)' }));
      svg.append(s('text', { x: lw - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 12, style: 'fill:var(--ink)', 'font-weight': hl ? 700 : 500 }, o.rename ? o.rename(gname) : gname));
      d.genes.forEach((g, j) => {
        const fr = d.frac[i][j], mu = d.mean[i][j]; const z = (mu - colMin[j]) / Math.max(1e-9, colMax[j] - colMin[j]);
        const r = 1.2 + 9.5 * Math.sqrt(fr);
        svg.append(s('circle', { cx: lw + j * cw + cw / 2, cy: y, r, fill: ramp[Math.min(5, Math.floor(z * 5.999))] }, s('title', null, `${gname} · ${g}: ${DS.fmt.pct(fr, 0)} of cells, mean ${mu.toFixed(2)}`)));
      });
    });
    const key = h('div', { class: 'row small muted' },
      h('span', { class: 'ramp' }, 'mean (scaled per gene): low', ramp.map((c) => h('i', { style: 'background:' + c })), 'high'),
      h('span', null, 'dot size = % of cells with ≥1 molecule'));
    parent.append(h('div', { class: 'plot-wrap' }, h('div', { class: 'scroll-x' }, svg), key)); return svg;
  };
  /* simple strip chart: groups [{label, pts:[{v,label}] , color}] */
  DS.strip = (parent, groups, o = {}) => {
    const W = o.width || 560, lw = o.labelW || 190, rh = 46, H = groups.length * rh + 34 + (o.xLabel ? 18 : 0);
    const max = o.max || 1;
    const X = (v) => lw + (W - lw - 20) * (v / max); const svg = svgBox(W, H, o.label);
    const axisY = groups.length * rh + 14;
    for (const t of o.ticks || []) svg.append(s('line', { x1: X(t), x2: X(t), y1: 6, y2: axisY - 6, stroke: 'var(--grid)' }),
      s('text', { x: X(t), y: axisY + 8, 'text-anchor': 'middle', 'font-size': 11 }, t));
    groups.forEach((g, i) => {
      const y = 10 + i * rh + rh / 2;
      svg.append(s('text', { x: lw - 12, y: y + 4, 'text-anchor': 'end', 'font-size': 12, style: 'fill:var(--ink)' }, g.label));
      const used = [], tagged = [];
      g.pts.forEach((p) => {
        let dy = 0; const x = X(p.v);
        while (used.some((u) => Math.abs(u[0] - x) < 9 && u[1] === dy)) dy = dy <= 0 ? -dy + 9 : -dy;
        used.push([x, dy]);
        svg.append(s('circle', { cx: x, cy: y + dy, r: 5, fill: g.color, stroke: 'var(--bg)', 'stroke-width': 2 },
          s('title', null, (p.label || '') + ': ' + p.v)));
        /* a label only when it will not sit on top of one already drawn */
        if (p.tag && !tagged.some((t) => Math.abs(t - x) < 26)) {
          tagged.push(x);
          svg.append(s('text', { x: x, y: y + dy - 10, 'text-anchor': 'middle', 'font-size': 10,
            style: 'fill:var(--muted)' }, p.tag));
        }
      });
    });
    if (o.xLabel) svg.append(s('text', { x: lw + (W - lw) / 2, y: H - 2, 'text-anchor': 'middle', 'font-size': 11,
      style: 'fill:var(--muted)' }, o.xLabel));
    parent.append(h('div', { class: 'scroll-x' }, svg)); return svg;
  };
  DS.ring = (frac, label) => {
    const r = 11, c = 2 * Math.PI * r; const svg = s('svg', { class: 'ring', viewBox: '0 0 28 28', 'aria-hidden': 'true' });
    svg.append(s('circle', { cx: 14, cy: 14, r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': 3 }));
    if (frac > 0) svg.append(s('circle', { cx: 14, cy: 14, r, fill: 'none', stroke: frac >= 1 ? 'var(--good)' : 'var(--blue)', 'stroke-width': 3, 'stroke-dasharray': `${c * frac} ${c}`, transform: 'rotate(-90 14 14)', 'stroke-linecap': 'round' }));
    svg.append(s('text', { x: 14, y: 18, 'text-anchor': 'middle' }, label)); return svg;
  };

  /* ------------------------------------------------------------ practice widgets */
  let CUR = null; /* {course, lessonIdx, ids:[]} set while a lesson renders */
  function shell(parent, o, kindDefault) {
    const kind = o.kind || kindDefault || 'practice';
    const st = h('span', { class: 'status none' }, 'Not tried');
    const wrap = h('section', { class: 'ex', id: 'ex-' + o.id },
      h('div', { class: 'ex-head' }, h('div', { class: 'row' }, h('span', { class: 'pill ' + kind }, { practice: 'Practice', check: 'Check', trap: 'Trap', explore: 'Explore' }[kind]), h('span', { class: 'ex-title' }, o.title || '')), st));
    const body = h('div', { class: 'ex-body' });
    if (o.why) body.append(h('div', { class: 'why', html: '<b>Why this matters.</b> ' + o.why }));
    wrap.append(body); parent.append(wrap);
    const course = CUR && CUR.course; if (CUR && o.id) CUR.ids.push(o.id);
    function paint(r) {
      if (!r) return; const okNow = r.ok === true, seen = r.ok === null;
      st.className = 'status ' + (seen ? 'seen' : okNow ? 'ok' : 'bad');
      st.textContent = seen ? 'Done' : okNow ? (r.first ? 'Correct first try' : 'Correct') : 'Not yet right';
    }
    paint(course && DS.progress.get(course, o.id));
    return { body, record: (ok) => { if (course) paint(DS.progress.record(course, o.id, ok)); } };
  }
  DS.mcq = (parent, o) => {
    const { body, record } = shell(parent, o);
    body.append(h('div', { class: 'q', html: o.q }));
    if (o.figure) o.figure(body);
    const sel = new Set(); const list = h('div', { class: 'opts', role: o.multi ? 'group' : 'radiogroup' });
    const opts = o.shuffle === false ? o.options : DS.shuffle(o.options, o.id.length * 31 + o.options.length);
    const btns = opts.map((op, k) => {
      const b = h('button', { type: 'button', class: 'opt' + (o.multi ? ' multi' : ''), role: o.multi ? 'checkbox' : 'radio', 'aria-checked': 'false' }, h('span', { class: 'box' }), h('span', { html: op.t }));
      b.addEventListener('click', () => {
        if (locked) return;
        if (!o.multi) { sel.clear(); btns.forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); }
        if (sel.has(k)) { sel.delete(k); b.classList.remove('sel'); b.setAttribute('aria-checked', 'false'); } else { sel.add(k); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); }
        check.disabled = sel.size === 0;
      });
      return b;
    });
    list.append(...btns); body.append(list);
    const fb = h('div', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const check = h('button', { class: 'btn', disabled: true }, 'Check answer');
    const again = h('button', { class: 'btn ghost', hidden: true }, 'Try again');
    let locked = false;
    check.addEventListener('click', () => {
      locked = true; let ok = true;
      opts.forEach((op, k) => {
        const chosen = sel.has(k); if (!!op.ok !== chosen) ok = false;
        const b = btns[k];
        if (chosen || (o.multi && op.ok)) b.classList.add(op.ok ? 'right' : 'wrong');
        if (chosen && !op.ok) b.classList.add('wrong');
        if (op.why && (chosen || op.ok)) b.append(h('span', { class: 'why-opt', html: op.why }));
      });
      if (!o.multi && !ok) opts.forEach((op, k) => { if (op.ok) btns[k].classList.add('right'); });
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad'); fb.hidden = false;
      fb.innerHTML = DS.markup('<b class="k">' + (ok ? 'Correct.' : o.multi ? 'Not quite. Green options are correct.' : 'Not quite.') + '</b> ' + (o.explain || ''));
      check.hidden = true; again.hidden = false; record(ok); if (o.after) o.after(fb, ok);
    });
    again.addEventListener('click', () => {
      locked = false; sel.clear(); check.disabled = true; check.hidden = false; again.hidden = true; fb.hidden = true;
      btns.forEach((b) => { b.classList.remove('sel', 'right', 'wrong'); b.setAttribute('aria-checked', 'false'); b.querySelectorAll('.why-opt').forEach((n) => n.remove()); });
    });
    body.append(h('div', { class: 'row' }, check, again), fb);
  };
  DS.numeric = (parent, o) => {
    const { body, record } = shell(parent, o);
    body.append(h('div', { class: 'q', html: o.q }));
    if (o.figure) o.figure(body);
    const inp = h('input', { type: 'number', id: 'in-' + o.id, step: 'any', style: 'width:140px', 'aria-label': 'Your answer' });
    const fb = h('div', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const go = h('button', { class: 'btn' }, 'Check');
    let tries = 0;
    const run = () => {
      const v = parseFloat(inp.value); if (isNaN(v)) { fb.className = 'feedback info'; fb.hidden = false; fb.textContent = 'Type a number first.'; return; }
      const ans = typeof o.answer === 'function' ? o.answer() : o.answer;
      const tol = o.tol != null ? o.tol : Math.abs(ans) * (o.rel || 0.05);
      const ok = Math.abs(v - ans) <= tol; tries++;
      fb.hidden = false; fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      const shown = o.fmt ? o.fmt(ans) : ans;
      fb.innerHTML = DS.markup(ok ? `<b class="k">Correct.</b> The value is ${shown}${o.unit ? ' ' + o.unit : ''}. ${o.explain || ''}` :
        tries < 2 && o.hint ? `<b class="k">Not yet.</b> Hint: ${o.hint}` : `<b class="k">Not quite.</b> The value is ${shown}${o.unit ? ' ' + o.unit : ''}. ${o.explain || ''}`);
      record(ok);
    };
    go.addEventListener('click', run); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    body.append(h('div', { class: 'row' }, inp, o.unit ? h('span', { class: 'muted' }, o.unit) : null, go), fb);
  };
  /* predict, then reveal the real data. kind: 'slider' | 'choice' */
  DS.predict = (parent, o) => {
    /* o.kind selects the input (slider|choice), so the badge gets its own key */
    const { body, record } = shell(parent, Object.assign({}, o, { kind: o.pill || 'practice' }), 'practice');
    body.append(h('div', { class: 'q', html: o.q }));
    let guess = o.kind === 'choice' ? null : o.value != null ? o.value : (o.min + o.max) / 2;
    const lock = h('button', { class: 'btn', disabled: o.kind === 'choice' }, 'Lock in my guess');
    if (o.kind === 'choice') {
      const g = h('div', { class: 'opts' });
      const bs = o.choices.map((c, k) => h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false', onclick: () => { guess = k; bs.forEach((b) => { b.classList.remove('sel'); b.setAttribute('aria-checked', 'false'); }); bs[k].classList.add('sel'); bs[k].setAttribute('aria-checked', 'true'); lock.disabled = false; } }, h('span', { class: 'box' }), h('span', { html: c })));
      g.append(...bs); body.append(g);
    } else {
      const out = h('span', { class: 'big-num' }, o.fmt ? o.fmt(guess) : guess);
      const r = h('input', { type: 'range', id: 'rg-' + o.id, min: o.min, max: o.max, step: o.step || 1, value: guess, 'aria-label': 'Your guess' });
      r.addEventListener('input', () => { guess = parseFloat(r.value); out.textContent = o.fmt ? o.fmt(guess) : guess; });
      body.append(h('div', { class: 'slider-row' }, r, out));
    }
    const reveal = h('div', { class: 'block', hidden: true });
    lock.addEventListener('click', () => {
      lock.disabled = true; body.querySelectorAll('input,.opt').forEach((n) => (n.disabled = true));
      reveal.hidden = false; const res = o.reveal(reveal, guess);
      const ok = res === undefined ? null : res; record(ok);
    });
    body.append(h('div', { class: 'row' }, lock), reveal);
  };
  DS.order = (parent, o) => {
    const { body, record } = shell(parent, o);
    body.append(h('div', { class: 'q', html: o.q }));
    let cur = DS.shuffle(o.items.map((t, i) => i), 11 + o.items.length);
    if (cur.every((v, i) => v === i)) cur.reverse();
    const list = h('div', { class: 'order' }); const fb = h('div', { class: 'feedback', hidden: true });
    function paint(marks) {
      list.innerHTML = '';
      cur.forEach((it, pos) => {
        const row = h('div', { class: 'order-item' + (marks ? (it === pos ? ' right' : ' wrong') : '') },
          h('span', { html: o.items[it] }),
          h('span', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' },
            h('button', { class: 'mv', 'aria-label': 'Move up', disabled: pos === 0, onclick: () => { [cur[pos - 1], cur[pos]] = [cur[pos], cur[pos - 1]]; paint(); fb.hidden = true; } }, '↑'),
            h('button', { class: 'mv', 'aria-label': 'Move down', disabled: pos === cur.length - 1, onclick: () => { [cur[pos + 1], cur[pos]] = [cur[pos], cur[pos + 1]]; paint(); fb.hidden = true; } }, '↓')));
        list.append(row);
      });
    }
    paint();
    const go = h('button', { class: 'btn', onclick: () => { const ok = cur.every((v, i) => v === i); paint(true); fb.hidden = false; fb.className = 'feedback ' + (ok ? 'ok' : 'bad'); fb.innerHTML = DS.markup('<b class="k">' + (ok ? 'Correct order.' : 'Not yet. Red steps are in the wrong place; move them and check again.') + '</b> ' + (ok ? o.explain || '' : '')); record(ok); } }, 'Check order');
    body.append(list, h('div', { class: 'row' }, go), fb);
  };
  DS.match = (parent, o) => {
    const { body, record } = shell(parent, o);
    body.append(h('div', { class: 'q', html: o.q }));
    const rights = DS.shuffle([...new Set(o.pairs.map((p) => p[1]).concat(o.extra || []))], 5);
    const rows = o.pairs.map(([l], i) => {
      const sel = h('select', { id: `m-${o.id}-${i}`, 'aria-label': 'Match for ' + l.replace(/<[^>]+>|`/g, '') }, h('option', { value: '' }, 'Choose…'), rights.map((r) => h('option', { value: r }, r)));
      const row = h('div', { class: 'match-row' }, h('span', { html: l }), sel); return { row, sel };
    });
    const fb = h('div', { class: 'feedback', hidden: true });
    const go = h('button', { class: 'btn', onclick: () => {
      let ok = true; rows.forEach((r, i) => { const good = r.sel.value === o.pairs[i][1]; if (!good) ok = false; r.row.classList.toggle('right', good); r.row.classList.toggle('wrong', !good); });
      fb.hidden = false; fb.className = 'feedback ' + (ok ? 'ok' : 'bad'); fb.innerHTML = DS.markup('<b class="k">' + (ok ? 'All matched.' : 'Some pairs are wrong (marked red). Change them and check again.') + '</b> ' + (ok ? o.explain || '' : '')); record(ok);
    } }, 'Check matches');
    body.append(h('div', { class: 'match' }, rows.map((r) => r.row)), h('div', { class: 'row' }, go), fb);
  };
  DS.flashcards = (parent, o) => {
    const { body, record } = shell(parent, Object.assign({ kind: 'check' }, o));
    const st = DS.progress.flash(o.course || (CUR && CUR.course) || 'x');
    let deck = o.cards.map((c, i) => i).filter((i) => !st[o.id + ':' + i]); if (!deck.length) deck = o.cards.map((c, i) => i);
    let k = 0, flipped = false;
    const card = h('div', { class: 'fcard', tabindex: 0, role: 'button', 'aria-label': 'Flip card' });
    const count = h('div', { class: 'small muted' });
    const paint = () => {
      const c = o.cards[deck[k]]; card.innerHTML = '';
      card.append(flipped ? h('div', { class: 'back', html: c[1] }) : h('div', null, h('div', { class: 'front', html: c[0] }), h('div', { class: 'small muted', style: 'margin-top:8px' }, 'Say the meaning, then tap to flip')));
      const known = o.cards.filter((_, i) => st[o.id + ':' + i]).length; count.textContent = `${known} of ${o.cards.length} marked as known`;
    };
    const flip = () => { flipped = !flipped; paint(); };
    card.addEventListener('click', flip); card.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    const next = (known) => {
      if (known) st[o.id + ':' + deck[k]] = 1; DS.progress.saveFlash();
      if (o.cards.every((_, i) => st[o.id + ':' + i])) record(null);
      if (known) { deck.splice(k, 1); if (!deck.length) { deck = o.cards.map((c, i) => i); } k = k % deck.length; } else k = (k + 1) % deck.length;
      flipped = false; paint();
    };
    body.append(h('div', { class: 'flash' }, card, h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => next(false) }, 'Show again later'), h('button', { class: 'btn', onclick: () => next(true) }, 'I knew it')), count));
    paint();
  };
  /* generic practice: custom body, caller reports ok via api.done(ok) */
  DS.task = (parent, o) => { const { body, record } = shell(parent, o); o.build(body, { done: (ok) => record(ok) }); };
  DS.block = (parent, kind, title, ...kids) => {
    const b = h('section', { class: 'block' }, h('div', { class: 'tag' }, h('span', { class: 'pill ' + kind }, { concept: 'Concept', explore: 'Explore', check: 'Check', trap: 'Trap', practice: 'Practice' }[kind] || kind), title ? h('h3', null, title) : null), ...kids);
    parent.append(b); return b;
  };
  DS.figure = (parent) => {
    const f = h('div', { class: 'card figure' });
    f.cap = (txt) => { f.append(h('div', { class: 'caption', html: txt })); return f; };
    parent.append(f); return f;
  };

  /* ------------------------------------------------------------ glossary popups */
  let pop = null;
  function showTerm(el) {
    const course = DS.courses[(CUR && CUR.course) || (location.hash.slice(1).split('-')[0])];
    const def = course && course.glossary && course.glossary[el.dataset.k]; if (!def) return;
    hideTerm(); pop = h('div', { class: 'term-pop', role: 'tooltip', html: '<b>' + el.dataset.k + '</b><br>' + def });
    document.body.append(pop); const r = el.getBoundingClientRect(); const pw = Math.min(300, window.innerWidth - 24);
    pop.style.maxWidth = pw + 'px'; pop.style.left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + window.scrollX)) + 'px';
    pop.style.top = r.bottom + window.scrollY + 8 + 'px';
  }
  function hideTerm() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('mouseover', (e) => { const t = e.target.closest && e.target.closest('.term'); if (t) showTerm(t); });
  document.addEventListener('mouseout', (e) => { const t = e.target.closest && e.target.closest('.term'); if (t) hideTerm(); });
  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('term')) showTerm(e.target); });
  document.addEventListener('focusout', hideTerm);
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('.term'); if (t) showTerm(t); else hideTerm(); });

  /* ------------------------------------------------------------ pages */
  const root = () => document.getElementById('app');
  const crumbs = () => document.getElementById('crumbs');
  function setCrumbs(parts) { const c = crumbs(); c.innerHTML = ''; parts.forEach((p, i) => { if (i) c.append(h('span', { 'aria-hidden': 'true' }, '/')); c.append(p[1] ? h('a', { href: '#' + p[1] }, p[0]) : h('span', null, p[0])); }); }
  function clear() { live.forEach((p) => p.ro && p.ro.disconnect()); live.clear(); CUR = null; hideTerm(); const r = root(); r.innerHTML = ''; return r; }

  function home() {
    const r = clear(); setCrumbs([]); document.title = 'Dataset School';
    const ids = Object.keys(DS.courses);
    const heroFig = h('div', { class: 'hero-fig' });
    r.append(h('header', { class: 'hero' }, h('div', { class: 'hero-in' },
      h('div', null,
        h('div', { class: 'eyebrow', style: 'color:#9fb3d1' }, 'Learn the datasets we work with'),
        h('h1', { style: 'margin-top:10px' }, 'Know your data before you model it'),
        h('p', { class: 'lead' }, 'Each course takes one dataset and teaches it in the order you need: the biology behind it, how it was measured, how the study was designed, and what it can and cannot answer. Every exercise runs on the real cells.'),
        h('div', { class: 'loop' }, h('span', null, '1  Predict'), h('span', null, '2  Explore the real data'), h('span', null, '3  Check yourself'), h('span', null, '4  Learn the trap'))),
      heroFig)));
    const page = h('main', { class: 'page' }); r.append(page);
    page.append(h('div', { class: 'section-title' }, h('h2', null, 'Courses'), h('p', { class: 'muted' }, 'One dataset per course. Progress is saved in this browser.')));
    const grid = h('div', { class: 'courses' }); page.append(grid);
    ids.forEach((id) => {
      const c = DS.courses[id]; const st = c.lessons.map((_, i) => DS.progress.lessonState(id, i));
      const done = st.filter((x) => x.known && x.done === x.total && x.total).length;
      grid.append(h('a', { class: 'course-card', href: '#' + id },
        h('div', { class: 'eyebrow' }, c.kicker), h('h3', null, c.title), h('p', { class: 'muted small' }, c.short),
        h('div', { class: 'facts' }, c.facts.map((f) => h('span', { class: 'fact' }, f))),
        h('div', { style: 'display:grid;gap:6px' }, h('div', { class: 'small muted' }, `${done} of ${c.lessons.length} lessons complete`), h('div', { class: 'bar' }, h('i', { style: `width:${(100 * done) / c.lessons.length}%` })))));
    });
    (DS.upcoming || []).forEach((u) => grid.append(h('div', { class: 'course-card soon' }, h('div', { class: 'eyebrow' }, 'Not built yet'), h('h3', null, u.title), h('p', { class: 'small' }, u.short), h('div', { class: 'facts' }, (u.facts || []).map((f) => h('span', { class: 'fact' }, f))))));
    const first = DS.courses[ids[0]]; if (first && first.heroFigure) first.heroFigure(heroFig);
  }

  function rail(course, id, li) {
    const nav = h('nav', { 'aria-label': 'Lessons' });
    const draw = () => {
      nav.innerHTML = '';
      course.lessons.forEach((L, i) => {
        const st = DS.progress.lessonState(id, i); const frac = st.known && st.total ? st.done / st.total : 0;
        nav.append(h('a', { class: 'l' + (i === li ? ' on' : ''), href: `#${id}-${i + 1}`, 'aria-current': i === li ? 'page' : null }, DS.ring(frac, String(i + 1)), h('span', null, L.title)));
      });
    };
    draw(); const off = DS.on('progress', draw);
    const st = course.lessons.map((_, i) => DS.progress.lessonState(id, i));
    const totals = st.reduce((a, x) => [a[0] + x.done, a[1] + x.total], [0, 0]);
    const overall = h('div', { class: 'overall' }, h('div', { class: 'small' }, h('b', null, 'Your progress'), ' · ', totals[1] ? `${totals[0]} of ${totals[1]} exercises tried` : 'not started'), h('div', { class: 'bar' }, h('i', { style: `width:${totals[1] ? (100 * totals[0]) / totals[1] : 0}%` })));
    return { el: h('aside', { class: 'rail' }, h('div', { class: 'rail-head' }, h('a', { href: '#' + id, class: 'rail-title', style: 'color:var(--ink);text-decoration:none' }, course.title), h('span', { class: 'small muted' }, course.kicker)), nav, overall), off };
  }

  function overview(id) {
    const c = DS.courses[id]; const r = clear(); setCrumbs([['Courses', ''], [c.title]]); document.title = c.title + ' · Dataset School';
    const page = h('main', { class: 'page' }); r.append(page);
    const fig = h('div', { class: 'card figure' });
    page.append(h('div', { class: 'ov-head' }, h('div', { style: 'display:grid;gap:14px' }, h('div', { class: 'eyebrow' }, c.kicker), h('h1', null, c.title), h('div', { class: 'prose', html: c.intro }), h('div', { class: 'facts' }, c.facts.map((f) => h('span', { class: 'fact' }, f))), h('div', { class: 'row' }, h('a', { class: 'btn', href: '#' + id + '-1', style: 'text-decoration:none' }, 'Start lesson 1'), h('span', { class: 'small muted' }, `${c.lessons.length} lessons · about ${c.lessons.reduce((a, l) => a + l.minutes, 0)} minutes`))), fig));
    if (c.overviewFigure) c.overviewFigure(fig);
    page.append(h('div', { class: 'section-title' }, h('h2', null, 'Lessons'), h('p', { class: 'muted' }, 'Each lesson ends with practice. You can take them in any order, but they build on each other.')));
    const list = h('div', { class: 'lesson-list' }); page.append(list);
    c.lessons.forEach((L, i) => {
      const st = DS.progress.lessonState(id, i); const done = st.known && st.total && st.done === st.total;
      list.append(h('a', { class: 'lesson-row', href: `#${id}-${i + 1}` }, h('span', { class: 'num' + (done ? ' done' : '') }, done ? '✓' : i + 1), h('span', { style: 'display:grid;gap:2px;min-width:0' }, h('b', null, L.title), h('span', { class: 'd' }, L.summary)), h('span', { class: 'small muted tnum' }, st.known ? `${st.done}/${st.total}` : `${L.minutes} min`)));
    });
    page.append(h('div', { class: 'row', style: 'margin-top:28px' }, h('button', { class: 'btn ghost', onclick: (e) => { if (e.target.dataset.armed) { DS.progress.reset(id); overview(id); } else { e.target.dataset.armed = 1; e.target.textContent = 'Click again to erase progress for this course'; } } }, 'Reset my progress'), h('span', { class: 'small muted' }, c.citation ? h('span', { html: c.citation }) : null)));
  }

  async function lesson(id, li) {
    const c = DS.courses[id]; const L = c.lessons[li]; if (!L) return overview(id);
    const r = clear(); setCrumbs([['Courses', ''], [c.title, id], ['Lesson ' + (li + 1)]]); document.title = L.title + ' · ' + c.title;
    const page = h('main', { class: 'page' }); r.append(page);
    const rl = rail(c, id, li); const body = h('article', { class: 'lesson' });
    page.append(h('div', { class: 'course-grid' }, rl.el, body));
    body.append(h('header', { class: 'lesson-head' },
      h('div', { class: 'eyebrow' }, `Lesson ${li + 1} of ${c.lessons.length}`), h('h1', null, L.title),
      h('div', { class: 'meta' }, h('span', null, `About ${L.minutes} minutes`), L.tags ? h('span', null, L.tags) : null),
      h('div', { class: 'goals' }, h('b', null, 'By the end you can'), h('ul', null, L.goals.map((g) => h('li', { html: g }))))));
    CUR = { course: id, li, ids: [] };
    const ctx = { course: c, id, base: c.base };
    try { await L.build(body, ctx); }
    catch (err) { console.error(err); body.append(h('div', { class: 'feedback bad' }, 'Part of this lesson could not load: ' + err.message + '. If you opened the file directly from disk, serve the folder over HTTP instead (see README).')); }
    if (CUR && CUR.course === id) DS.progress.setLessonEx(id, li, CUR.ids.slice());
    const prev = li > 0 ? h('a', { class: 'btn ghost', href: `#${id}-${li}`, style: 'text-decoration:none' }, '← ' + c.lessons[li - 1].title) : h('span');
    const next = li < c.lessons.length - 1 ? h('a', { class: 'btn', href: `#${id}-${li + 2}`, style: 'text-decoration:none' }, 'Next: ' + c.lessons[li + 1].title + ' →') : h('a', { class: 'btn', href: '#' + id, style: 'text-decoration:none' }, 'Back to the course');
    body.append(h('div', { class: 'next-row' }, prev, next));
  }

  function routeNow() {
    const hsh = decodeURIComponent(location.hash.slice(1));
    const m = hsh.match(/^([a-z0-9]+)(?:-(\d+))?$/);
    if (!hsh || !m || !DS.courses[m[1]]) home();
    else if (m[2]) lesson(m[1], parseInt(m[2], 10) - 1);
    else overview(m[1]);
    window.scrollTo(0, 0);
  }
  DS.start = () => { window.addEventListener('hashchange', routeNow); routeNow(); };
})();
