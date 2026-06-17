/* ════════════════════════════════════════════════════════
   Ali Mikaeili — portfolio interactions
   ════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ── Theme toggle (persisted) ─────────────────────────── */
  var toggle = document.getElementById('theme-toggle');
  function syncToggle(theme) {
    if (!toggle) return;
    var dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  syncToggle(root.getAttribute('data-theme'));
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#100f0d' : '#ffffff');
      syncToggle(next);
    });
  }

  /* ── Top bar shadow on scroll ─────────────────────────── */
  var topbar = document.getElementById('topbar');
  function onScroll() {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Reveal on scroll ─────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      // gentle stagger within the same viewport
      el.style.transitionDelay = Math.min(i % 6, 5) * 40 + 'ms';
      revObs.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Scroll-spy for the top nav ───────────────────────── */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.topnav a[data-spy]'));
  var sections = spyLinks
    .map(function (a) { return document.getElementById(a.dataset.spy); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          spyLinks.forEach(function (a) {
            var on = a.dataset.spy === id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spyObs.observe(s); });
  }

  /* ── Footer year ──────────────────────────────────────── */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
