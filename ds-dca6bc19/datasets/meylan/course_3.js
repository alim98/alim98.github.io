/* Meylan course: lesson 5 (space and the depth field) and lesson 6 (before vs after). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;
  const P = (html) => DS.prose(html);

  /* ---------------------------------------------------------------- lesson 5 */
  M.lessons.push({
    title: 'Space, and the thing that looks like biology',
    summary: 'The map is the reason to use this data. It also carries a technical gradient that mimics biology.',
    minutes: 15,
    tags: 'Spatial · confounds',
    goals: ['use position as a variable instead of a backdrop',
      'recognise the per-cell detection gradient and say why it mimics a biological field',
      'name the control that a spatial claim needs before it is worth reporting'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'What position buys you', P(
        'With a map you can ask questions that a dissociated dataset cannot answer at all: what is next to what, how '
        + 'far a signal reaches, whether two populations avoid each other. Those are the questions worth spending '
        + 'this dataset on.'));

      DS.block(body, 'explore', 'The gradient that is not biology', P(
        'Switch the section below to <b>Molecules per cell</b>. This is pure measurement: the total number of '
        + 'molecules counted in each cell, summed over all 480 genes. If detection were uniform, the colours would '
        + 'look like noise.'));
      const tf = DS.figure(body);
      const tv = await M.tissueView(tf, { id: 'l5t', section: 'P45_PRE', mode: 'comp', maxH: 560,
        modes: [['comp', 'Cell type'], ['depth', 'Molecules per cell'], ['state', 'Tumour state'], ['gene', 'Gene']],
        gene: 'GFAP' });
      tf.cap('Switch between cell type, molecules per cell, and a gene, and compare the patterns. The same tissue, '
        + 'three different questions.');

      DS.predict(body, { id: 'l5-depth', title: 'Predict: what does detection look like in space?',
        kind: 'choice',
        q: 'How do you expect "molecules per cell" to be arranged across the section?',
        choices: ['Like noise, with no spatial pattern',
          'In smooth regions: whole areas high, whole areas low',
          'High at the edges of the tissue, low in the middle'],
        reveal: (el, guess) => {
          tv.setMode('depth');
          el.append(h('div', { class: 'feedback info', html:
            'It is organised in <b>smooth regions</b>. Detection depends on how well a piece of tissue was fixed, '
            + 'how thick the section is, where the focus sat, and how dense the cells are — all of which vary '
            + 'smoothly across a slide. Neighbouring cells therefore have similar totals, with a correlation of '
            + 'about 0.5 between a cell and its neighbours in this dataset.' }));
          el.append(P('<p class="small">This matters more than it sounds. A smooth field is exactly the shape a '
            + 'biological field has. If a region has 30% more molecules per cell, then <b>every gene</b> looks '
            + 'higher there, so any pair of genes looks correlated in space and any programme looks regionally '
            + 'organised. On this dataset, that effect alone produced tens of thousands of apparent gene-gene '
            + 'couplings in our own earlier work, and all of them disappeared once detection was matched.</p>'));
          return guess === 1;
        } });

      DS.mcq(body, { id: 'l5-control', title: 'Design the control yourself',
        q: 'You find that in POST tissue, tumour cells near myeloid cells express more inflammatory genes. What must '
          + 'you rule out before this means anything? Choose all that apply.',
        multi: true,
        options: [
          { t: 'Molecules-per-cell is higher in myeloid-rich regions, lifting every gene there', ok: true,
            why: 'Yes. The first control: compare cells with similar totals, or include the total in the model.' },
          { t: 'Inflammatory molecules from the myeloid cell are being counted inside the tumour cell', ok: true,
            why: 'Yes: spillover from lesson 2. Repeat the test excluding immediate neighbours, say beyond 20 µm.' },
          { t: 'The effect appears in only one or two patients', ok: true,
            why: 'Yes. With 8 patients, report how many show the effect, every time.' },
          { t: 'The inflammatory genes are on the panel',
            why: 'They are, and that is a precondition for measuring anything, not a confound.' },
          { t: 'Myeloid cells and tumour cells have different shapes',
            why: 'Cell area does affect how many molecules a cell catches, which is part of the detection control '
              + 'above rather than a separate concern.' }],
        explain: 'The pattern repeats: a spatial claim needs a detection control, a spillover control, and a count '
          + 'of how many patients show it. Any one of the three can explain away a result on its own.' });

      DS.task(body, { id: 'l5-neighbour', title: 'Measure the neighbourhood yourself',
        why: 'Doing the measurement once, on real coordinates, makes the abstract warning concrete.',
        build(el, api) {
          el.append(P('Click anywhere on the tissue map below. The page takes the 200 nearest cells to that point '
            + 'and reports the local composition and the local detection level, against the whole-section average. '
            + 'Click a hypoxic patch, then a vessel-rich area, then the tissue edge.'));
          const out = h('div', { class: 'readout' });
          const fig = h('div'); el.append(fig, out);
          let clicked = 0;
          M.tissueView(fig, { id: 'l5c', section: 'P28_PRE', mode: 'state', controls: false, maxH: 460,
            onClick(X, Y, d, tapi) {
              const n = d.n, idx = [];
              for (let i = 0; i < n; i++) idx.push(i);
              idx.sort((a, b) => ((d.x[a] - X) ** 2 + (d.y[a] - Y) ** 2) - ((d.x[b] - X) ** 2 + (d.y[b] - Y) ** 2));
              const k = idx.slice(0, 200);
              let hyp = 0, mye = 0, tot = 0, allTot = 0;
              for (const i of k) { if (d.t2[i] === 5) hyp++; if (M.compOf[d.t2[i]] === 1) mye++; tot += d.total[i]; }
              for (let i = 0; i < n; i++) allTot += d.total[i];
              const r = Math.sqrt((d.x[k[199]] - X) ** 2 + (d.y[k[199]] - Y) ** 2);
              tapi.mark(X, Y, r);
              const mean = tot / 200, gmean = allTot / n;
              out.innerHTML = '';
              const add = (lab, v, note) => out.append(h('div', null, h('div', { class: 'v' }, v),
                h('div', { class: 'k' }, lab), note ? h('div', { class: 'k' }, note) : null));
              add('radius of the circle', Math.round(r) + ' µm', 'to the 200th nearest cell');
              add('MES-like 2 (hypoxia) here', F.pct(hyp / 200, 0),
                'section-wide ' + F.pct(st.sections.P28_PRE.tier2[5] / st.sections.P28_PRE.n, 0));
              add('myeloid cells here', F.pct(mye / 200, 0), 'section-wide '
                + F.pct((st.sections.P28_PRE.tier2[6] + st.sections.P28_PRE.tier2[7] + st.sections.P28_PRE.tier2[8])
                  / st.sections.P28_PRE.n, 0));
              add('molecules per cell here', Math.round(mean),
                'section-wide ' + Math.round(gmean) + ' (' + (mean / gmean).toFixed(2) + '×)');
              if (++clicked === 3) api.done(null);
            } });
          el.append(P('<p class="small">Click at least three different places. You will usually find that the '
            + 'neighbourhoods richest in one cell population also differ in molecules per cell — which is the '
            + 'confound, measured in the data you are looking at.</p>'));
        } });

      DS.block(body, 'concept', 'Scale is part of the claim', P(
        'A neighbourhood is whatever radius you chose. Spillover acts over a few micrometres, cell-to-cell signalling '
        + 'over tens, oxygen gradients over hundreds. A result stated without its radius cannot be reproduced, and a '
        + 'result that only exists at one radius usually belongs to whatever process acts at that distance.'));
    },
  });

  /* ---------------------------------------------------------------- lesson 6 */
  M.lessons.push({
    title: 'Before and after, honestly',
    summary: 'The comparison everyone wants from this dataset, and how far it actually carries.',
    minutes: 20,
    tags: 'Design · the floor',
    goals: ['list the three differences between PRE and POST that have nothing to do with the virus',
      'read a paired patient chart and say how consistent an effect is',
      'compare any PRE-to-POST change against the piece-to-piece floor measured in this cohort'],
    async build(body) {
      const st = await M.stats();
      const S = st.samples_info, T1 = st.tier1;
      const shareT = (s) => S[s].tier1[T1.indexOf('T cells')] / S[s].n;

      DS.block(body, 'concept', 'Three differences that are not treatment', P(
        'PRE and POST differ in the virus, and in at least three other ways. Each one can produce a change on its own.'));

      const sz = DS.figure(body);
      await M.sizeFigure(sz);
      sz.cap('Every tissue piece in the dataset, drawn at one shared scale. The PRE biopsies (orange) are small cores; '
        + 'the POST specimens (blue) are whole resections, up to 89 mm². This is why 92% of all cells in the dataset '
        + 'are POST cells: not more cells per unit of tissue, but far more tissue.');

      DS.mcq(body, { id: 'l6-size', title: 'What a bigger piece changes',
        q: 'POST pieces are many times larger than PRE pieces. Which of these follow from the size difference '
          + 'alone, with no biological change at all? Choose all that apply.',
        multi: true,
        options: [
          { t: 'POST covers more kinds of region: core, edge, necrosis, vessels', ok: true,
            why: 'Yes, and composition follows region. A biopsy core samples one neighbourhood.' },
          { t: 'Rare cell types are found in POST but missed in PRE', ok: true,
            why: 'Yes. With 6,655 cells you will miss a population present at 0.1%.' },
          { t: 'Per-patient estimates are much steadier in POST', ok: true,
            why: 'Yes, so a PRE-to-POST difference is a comparison between a noisy number and a precise one.' },
          { t: 'The virus replicated more in POST tissue',
            why: 'That is the biological claim the design cannot separate from the three effects above.' }],
        explain: 'Sampling asymmetry alone shifts composition. Any composition comparison across timepoints has to '
          + 'cope with it, usually by restricting to comparable regions or by comparing within a cell type.' });

      const runs = DS.figure(body);
      const rows = M.PATIENTS.map((p) => {
        const pres = Object.keys(st.sections).filter((k) => k.indexOf(p + '_PRE') === 0);
        const a = st.sections[pres[0]], b = st.sections[p + '_POST'];
        return { p, preDate: a.date, postDate: b.date, preSw: a.software, postSw: b.software,
          same: a.slide === b.slide, batch: S[p + '_pre'].batch };
      });
      const tbl = h('table', { class: 't' },
        h('thead', null, h('tr', null, h('th', null, 'Patient'), h('th', null, 'PRE run'), h('th', null, 'POST run'),
          h('th', null, 'Same instrument slide?'), h('th', null, 'Software PRE / POST'),
          h('th', null, 'Authors’ batch label'))),
        h('tbody', null, rows.map((r) => h('tr', { class: r.same ? '' : 'hl' }, h('td', null, r.p),
          h('td', null, r.preDate), h('td', null, r.postDate),
          h('td', null, r.same ? 'yes' : h('span', { class: 'flag' }, 'no')),
          h('td', null, r.preSw + ' / ' + r.postSw), h('td', null, r.batch)))));
      runs.append(h('div', { class: 'scroll-x' }, tbl));
      runs.cap('Read from the instrument files. For four patients, PRE and POST were imaged on different days with '
        + 'different software versions (highlighted); for the other four they shared one slide. Note the last '
        + 'column: the batch label stored in the dataset follows the <b>patient</b>, so it does not mark this '
        + 'difference at all. If you adjust for "batch" as given, you have not adjusted for the run.');

      DS.mcq(body, { id: 'l6-batch', title: 'Using the batch column',
        q: 'You plan to control for technical differences by adding the dataset’s `batch` column to your model. '
          + 'Looking at the table, what does that achieve?',
        why: 'The column is right there with a reassuring name. Four patients’ PRE and POST runs differ while '
          + 'sharing one batch value.',
        options: [
          { t: 'Nothing for the PRE-to-POST comparison, because both timepoints of a patient carry the same batch '
              + 'value', ok: true,
            why: 'Correct. Within a patient, batch is constant, so it cannot absorb a run difference between '
              + 'timepoints.' },
          { t: 'It removes the run difference for the four affected patients',
            why: 'It cannot: the value is identical for PRE and POST in every patient.' },
          { t: 'It removes patient differences instead',
            why: 'It partly tracks patient, but patient identity is already available directly.' },
          { t: 'It is the same as adjusting for molecules per cell',
            why: 'Different thing. Detection varies within a single section, as lesson 5 showed.' }],
        explain: 'Check what a metadata column actually varies with before trusting its name. Here the honest options '
          + 'are to compare the four same-slide patients separately, or to treat the run as an unmeasured difference '
          + 'and say so.' });

      DS.block(body, 'explore', 'Two real changes after treatment', P(
        'Now the results. Both of these are computed here from all 2.4 million cells: the share of cells that are '
        + 'T cells, and the amount of [[interferon|interferon-stimulated]] gene expression, which is what cells '
        + 'switch on when they detect a virus.'));

      const pf1 = DS.figure(body);
      DS.paired(pf1, M.PATIENTS.map((p) => ({ label: p, a: shareT(p + '_pre'), b: shareT(p + '_post') })),
        { log: true, floor: 2e-4, ticks: [0.001, 0.003, 0.01, 0.03, 0.1], tickFmt: (t) => (t * 100) + '%',
          fmt: (v) => F.pct(v, 2), label: 'T-cell share before and after, per patient', height: 320 });
      pf1.cap('Share of all cells that are T cells, before and after, one line per patient (log scale). It rises in '
        + '8 of 8 patients. Note how far apart the patients start: P51 PRE is '
        + F.pct(shareT('P51_pre'), 2) + ', P32 PRE is ' + F.pct(shareT('P32_pre'), 1) + '.');

      const pf2 = DS.figure(body);
      DS.paired(pf2, M.PATIENTS.map((p) => ({ label: p, a: S[p + '_pre'].isg_per_1k, b: S[p + '_post'].isg_per_1k,
        hl: p === 'P45' })), { ticks: [0, 10, 20, 30, 40], fmt: (v) => F.num(v, 1),
        label: 'Interferon-stimulated gene level before and after', height: 320 });
      pf2.cap('Molecules of six interferon-stimulated genes ('
        + st.isg_genes.join(', ') + ') per 1,000 molecules measured, so detection differences cancel out. It rises in '
        + '7 of 8 patients. P45 is the exception and falls.');

      DS.numeric(body, { id: 'l6-count', title: 'How consistent is consistent?',
        q: 'In how many of the 8 patients does the T-cell share rise after treatment?',
        why: 'Reporting the count of patients, rather than a pooled average, is the habit that keeps a one-patient '
          + 'effect from being written up as a cohort result.',
        answer: () => M.PATIENTS.filter((p) => shareT(p + '_post') > shareT(p + '_pre')).length, tol: 0.5,
        unit: 'of 8 patients',
        explain: 'All eight. That consistency is what makes the T-cell rise the most solid observation in the '
          + 'dataset — though the three non-treatment differences above still apply, since every patient also '
          + 'went from a small biopsy to a large resection.' });

      DS.block(body, 'trap', 'The floor: how much changes with no treatment at all', P(
        'Two patients, P05 and P21, had their PRE biopsy cut into pieces that were imaged separately. Those '
        + 'pieces are the same tumour, the same day, the same instrument run, and no treatment in between. '
        + 'Whatever differs between them is the floor: the amount of change you get for free. A PRE-to-POST '
        + 'difference smaller than the floor says nothing about the virus.'));

      const fl = DS.figure(body);
      const pairs = st.floor.pairs, pp = st.floor.prepost;
      const maxU = Math.max.apply(null, pairs.map((x) => x.tvd));
      DS.strip(fl, [
        { label: 'Two untreated pieces of one tumour', color: 'var(--c2)',
          pts: pairs.map((x) => ({ v: x.tvd, label: x.a + ' vs ' + x.b, tag: x.a.slice(0, 3) })) },
        { label: 'Before vs after treatment', color: 'var(--c1)',
          pts: pp.map((x) => ({ v: x.tvd, label: x.patient, tag: x.patient })) }],
        { max: 0.55, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], labelW: 215, width: 600,
          xLabel: 'change in tumour-state composition (total variation distance; 0 = identical)',
          label: 'Treatment change against the untreated floor' });
      fl.cap('Each dot is one comparison of tumour-state composition. Orange: pairs of untreated pieces from P05 and '
        + 'P21, reaching ' + F.num(maxU, 3) + '. Blue: each patient before against after, median '
        + F.num(DS.median(pp.map((x) => x.tvd)), 3) + '. '
        + pp.filter((x) => x.tvd > maxU).length + ' of 8 patients exceed the untreated range; '
        + pp.filter((x) => x.tvd <= maxU).map((x) => x.patient).join(', ') + ' do not.');

      DS.mcq(body, { id: 'l6-floor', title: 'Reading the floor',
        q: 'Given that figure, which conclusion is supported?',
        options: [
          { t: 'Tumour-state composition changes after treatment in some patients, but in half of them the change '
              + 'is no larger than between two untreated pieces of one tumour', ok: true,
            why: 'This is what the numbers support, and it names the calibration.' },
          { t: 'Treatment reshapes tumour-state composition, as 8 of 8 patients changed',
            why: 'Every pair of anything differs. Without the floor, "changed" is not informative.' },
          { t: 'Treatment has no effect on composition',
            why: 'Too strong in the other direction: four patients, led by P05 and P28, are clearly above the floor.' },
          { t: 'The floor is a measurement error that should be removed',
            why: 'It is not error. Different pieces of one tumour genuinely have different compositions, which is a '
              + 'property of the tumour you must compare against.' }],
        explain: 'The floor here rests on two patients and four pairs, so it is itself uncertain — state it as a '
          + 'rough calibration, and prefer comparisons that are immune to it, such as the same cell type’s own '
          + 'gene expression rather than composition.' });

      const isgPairs = st.floor.isg_pairs, tcPairs = st.floor.tcell_pairs;
      const isgFloor = Math.max.apply(null, isgPairs.map((x) => Math.abs(x.va - x.vb)));
      const tcFloor = Math.max.apply(null, tcPairs.map((x) => Math.abs(x.va - x.vb)));
      const isgRise = M.PATIENTS.map((p) => S[p + '_post'].isg_per_1k - S[p + '_pre'].isg_per_1k);
      const tcRise = M.PATIENTS.map((p) => shareT(p + '_post') - shareT(p + '_pre'));
      const isgPass = isgRise.filter((v) => v > isgFloor).length;
      const tcPass = tcRise.filter((v) => v > tcFloor).length;

      DS.block(body, 'check', 'Put the two findings through the floor', P(
        'The floor is not only for composition. Two untreated pieces give a floor for any quantity you can measure '
        + 'per piece, so run the two changes above through it.'));
      const ff = DS.figure(body);
      DS.strip(ff, [
        { label: 'Two untreated pieces', color: 'var(--c2)',
          pts: isgPairs.map((x) => ({ v: Math.abs(x.va - x.vb), label: x.a + ' vs ' + x.b, tag: x.a.slice(0, 3) })) },
        { label: 'Before vs after treatment', color: 'var(--c1)',
          pts: M.PATIENTS.map((p, k) => ({ v: Math.max(0, isgRise[k]), label: p, tag: p })) }],
        { max: 22, ticks: [0, 5, 10, 15, 20], labelW: 190, width: 600,
          xLabel: 'rise in ISG molecules per 1,000 measured (a fall is drawn at zero)',
          label: 'Interferon response against the untreated floor' });
      ff.cap('Two untreated pieces of one tumour differ by up to ' + F.num(isgFloor, 1)
        + ' ISG molecules per 1,000. Only ' + isgPass + ' of 8 patients rise by more than that ('
        + M.PATIENTS.filter((p, k) => isgRise[k] > isgFloor).join(' and ')
        + '). The direction is consistent in 7 of 8, but most individual rises sit inside the range two untreated '
        + 'pieces of one tumour already span.');

      DS.numeric(body, { id: 'l6-isgfloor', title: 'How many clear the interferon floor?',
        q: 'From the figure above: in how many of the 8 patients is the rise in interferon-stimulated genes larger '
          + 'than the biggest difference between two untreated pieces?',
        why: 'A direction repeating in 7 of 8 patients feels conclusive until you ask how big each rise is next to '
          + 'the floor.',
        answer: () => isgPass, tol: 0.5, unit: 'of 8 patients',
        explain: 'So the honest sentence has two halves: the interferon response rises after treatment in 7 of 8 '
          + 'patients, and in ' + isgPass + ' of them the rise is larger than anything seen between untreated '
          + 'pieces of one tumour.' });

      DS.block(body, 'concept', 'What survives all of it', P(
        'Run this lesson against the two candidate findings and they come out differently.'
        + '<ul><li><b>T cells increase after treatment.</b> True in 8 of 8 patients, and ' + tcPass + ' of 8 clear '
        + 'the untreated floor of ' + F.pct(tcFloor, 2) + ' of cells, the largest rise by a factor of about '
        + Math.round(Math.max.apply(null, tcRise) / tcFloor) + '. This is the claim in this dataset that passes '
        + 'everything, with the sampling difference between a biopsy core and a resection still attached to it.</li>'
        + '<li><b>Interferon-stimulated genes rise.</b> Consistent in direction, 7 of 8, but only ' + isgPass
        + ' of 8 rise by more than the floor. Report it as a direction, not as a magnitude.</li></ul>'
        + 'Both are tissue-wide and neither needs a cell-state label. That is the shape of a claim this design can '
        + 'carry.'));
    },
  });
})();
