/* ── Apply project accent colors from data attr ─────── */
document.querySelectorAll('.proj-card').forEach(card => {
  const color = card.dataset.color;
  if (color) card.querySelector('.proj-accent').style.background = color;
});

/* ── Tab switching ───────────────────────────────────── */
const btns   = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');
const main   = document.getElementById('main-panel');

function switchTo(id) {
  btns.forEach(b => {
    const active = b.dataset.panel === id;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active);
  });
  panels.forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + id);
  });
  main.scrollTop = 0;
}

btns.forEach(btn => {
  btn.addEventListener('click', () => switchTo(btn.dataset.panel));
});

/* ── Keyboard shortcuts 1–4 ──────────────────────────── */
const panelIds = ['experience', 'publications', 'projects', 'skills'];
const hint     = document.getElementById('kbd-hint');
let hintTimer;

document.addEventListener('keydown', e => {
  const n = parseInt(e.key);
  if (n >= 1 && n <= 4 && !e.metaKey && !e.ctrlKey && !e.altKey) {
    switchTo(panelIds[n - 1]);
    // show hint briefly on first use
    clearTimeout(hintTimer);
    hint.classList.add('show');
    hintTimer = setTimeout(() => hint.classList.remove('show'), 2000);
  }
});

/* Show hint once on load after 1.5s */
setTimeout(() => {
  hint.classList.add('show');
  hintTimer = setTimeout(() => hint.classList.remove('show'), 3000);
}, 1500);
