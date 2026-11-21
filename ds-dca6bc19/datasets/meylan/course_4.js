/* Meylan course: lesson 7 (finding the virus and the T-cell probes) and lesson 8 (design clinic). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;
  const P = (html) => DS.prose(html);

  /* ---------------------------------------------------------------- lesson 7 */
  M.lessons.push({
    title: 'Finding the virus, and failing to',
    summary: 'Two custom probe sets that look like a direct readout and mostly measure background.',
    minutes: 15,
    tags: 'Thresholds · specificity',
    goals: ['set a detection threshold using a group that cannot be positive',
      'say how much of a probe’s signal is background before using it',
      'decide when a custom probe set is usable and when it is not'],
    async build(body) {
      const st = await M.stats(), S = st.samples_info;
      const sum = (f) => M.PATIENTS.reduce((a, p) => a + f(p), 0);
      const nPre = sum((p) => S[p + '_pre'].n), nPost = sum((p) => S[p + '_post'].n);

      DS.block(body, 'concept', 'The most direct question in the dataset', P(
        'Five of the 480 probes target genes of the virus itself. So you can ask the most direct question there is: '
        + '<b>which cells had the virus in them?</b> It looks like a lookup. It is not.'
        + '<p>The honest check is sitting in the design. PRE tissue was taken at the moment of injection, before any '
        + 'virus could have spread or replicated, so a PRE cell showing viral molecules is almost certainly a '
        + 'mistake. PRE is a group that cannot be positive, which is exactly what you need to set a threshold.</p>'));

      DS.task(body, { id: 'l7-threshold', title: 'Set the threshold yourself', kind: 'practice',
        why: 'The first version of our own analysis of this cohort used "at least one viral molecule" as '
          + 'virus-positive. The slider shows what that choice does.',
        build(el, api) {
          const rows = [1, 2, 3].map((th) => ({ th,
            pre: sum((p) => S[p + '_pre']['hsv_ge' + th]) / nPre,
            post: sum((p) => S[p + '_post']['hsv_ge' + th]) / nPost,
            up: M.PATIENTS.filter((p) => S[p + '_post']['hsv_ge' + th] / S[p + '_post'].n
              > S[p + '_pre']['hsv_ge' + th] / S[p + '_pre'].n).length }));
          const out = h('div', { class: 'readout' });
          const val = h('span', { class: 'big-num' }, '1');
          const sl = h('input', { type: 'range', min: 1, max: 3, step: 1, value: 1, id: 'l7-sl',
            'aria-label': 'Minimum viral molecules to call a cell virus-positive' });
          const bars = h('div');
          function paint() {
            const r = rows[parseInt(sl.value, 10) - 1];
            val.textContent = r.th;
            out.innerHTML = '';
            const add = (k, v, note) => out.append(h('div', null, h('div', { class: 'v' }, v),
              h('div', { class: 'k' }, k), note ? h('div', { class: 'k' }, note) : null));
            add('"positive" cells in PRE', F.pct(r.pre, 3), 'cannot be true positives');
            add('"positive" cells in POST', F.pct(r.post, 3), '');
            add('POST / PRE', r.post / r.pre >= 10 ? Math.round(r.post / r.pre) + '×' : (r.post / r.pre).toFixed(2) + '×', '');
            add('patients with POST above PRE', r.up + ' of 8', '');
            bars.innerHTML = '';
            DS.hbars(bars, [{ label: 'PRE', v: r.pre * 100, color: 'var(--c2)' },
              { label: 'POST', v: r.post * 100, color: 'var(--c1)' }],
              { labelW: 60, width: 520, max: 0.95, fmt: (v) => v.toFixed(3) + '% of cells',
                label: 'Virus-positive rate at the chosen threshold' });
          }
          sl.addEventListener('input', paint);
          el.append(h('div', { class: 'controls' },
            h('label', { for: 'l7-sl', style: 'flex:1;min-width:240px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center' },
              'Call a cell virus-positive at ≥', sl), val, h('span', { class: 'muted' }, 'viral molecules')),
            out, bars);
          paint();
          const ge3 = M.PATIENTS.map((p) => S[p + '_post'].hsv_ge3);
          const ge3Tot = ge3.reduce((a, b) => a + b, 0);
          const rank = ge3.slice().sort((a, b) => b - a);
          const top2 = rank[0] + rank[1];
          const top2Names = M.PATIENTS.filter((p) => S[p + '_post'].hsv_ge3 >= rank[1]);
          el.append(DS.prose('At <b>1 molecule</b>, ' + F.pct(rows[0].pre, 2) + ' of PRE cells count as '
            + '"virus-positive" against ' + F.pct(rows[0].post, 2) + ' of POST cells, and POST is higher than PRE '
            + 'in only <b>' + rows[0].up + ' of 8</b> patients. One molecule is background: a stray molecule in '
            + 'empty space is assigned to whichever cell is nearest, as you saw in lesson 2. At <b>3 molecules</b> '
            + 'the rate separates by about ' + Math.round(rows[2].post / rows[2].pre) + '\u00d7 and ' + rows[2].up
            + ' of 8 patients go the right way \u2014 but only ' + F.int(ge3Tot) + ' POST cells in the entire '
            + 'dataset qualify, ' + F.pct(top2 / ge3Tot, 0) + ' of them in ' + top2Names.join(' and ')
            + '. Sensitivity and specificity trade off, and at neither end do you get a large, clean group.',
            'small'));
          let moved = false;
          sl.addEventListener('input', () => { if (!moved) { moved = true; api.done(null); } });
        } });

      DS.mcq(body, { id: 'l7-use', title: 'What can you do with the viral probes?',
        q: 'Given what the slider shows, which uses of the viral probes are defensible?',
        multi: true,
        options: [
          { t: 'Report, with the threshold stated, that virus-positive cells are rare and concentrated in a couple '
              + 'of patients', ok: true,
            why: 'Yes. State the threshold and the per-patient counts, and it is an honest description.' },
          { t: 'Split POST cells into infected and uninfected at ≥1 molecule and compare their gene expression',
            why: 'No. At ≥1 the groups are mostly background, so the comparison is between cells with a stray '
              + 'molecule and cells without one — which tracks local molecule density, not infection.' },
          { t: 'Use the virus-positive count per patient as a dose measure',
            why: 'No. It depends on which piece was cut and when, and the trial’s own dose is recorded elsewhere.' },
          { t: 'Treat PRE as a negative control to set any threshold you use', ok: true,
            why: 'Yes. This is the one real gift of the design: a group that cannot be positive.' }],
        explain: 'The general move: before using a rare readout, find a group that must be negative and look at the '
          + 'rate there. If it is close to your positive group, your threshold is measuring noise.' });

      DS.block(body, 'explore', 'Where the viral molecules land', P(
        'Across the whole dataset, ' + F.pct(st.hsv_frac_in_tumor, 0) + ' of viral molecules are counted in '
        + 'tumour cells, which is <b>less</b> than the tumour share of all cells ('
        + F.pct(st.cell_share_tier1[0], 0) + '). A virus that replicates inside tumour cells should not look like '
        + 'that, which is one more sign that single viral molecules are mostly background. Colour a POST section '
        + 'by HSV-1 below and compare it against the <b>Molecules per cell</b> view: the faint viral signal tends '
        + 'to follow wherever detection is high.'));
      const tf = DS.figure(body);
      await M.tissueView(tf, { id: 'l7t', section: 'P05_POST', mode: 'hsv',
        modes: [['hsv', 'HSV-1'], ['depth', 'Molecules per cell'], ['comp', 'Cell type']] });
      tf.cap('P05 POST, the section with the highest virus-positive rate at 1 molecule ('
        + F.pct(S.P05_post.hsv_ge1 / S.P05_post.n, 1) + ' of cells). It is also the only section where the strict '
        + '3-molecule threshold finds a sizeable group: ' + F.int(S.P05_post.hsv_ge3) + ' cells, '
        + F.pct(S.P05_post.hsv_ge3 / S.P05_post.n, 1) + ' of this section.');

      DS.block(body, 'trap', 'The same lesson in a second probe set', P(
        'The panel also carries 43 probes designed against individual T-cell receptors, taken from two patients '
        + '(P28 and P34) so that their expanded T-cell clones could be followed in tissue. A probe for a T-cell '
        + 'receptor should only ever fire inside a T cell.'));

      DS.numeric(body, { id: 'l7-tcr', title: 'How specific are the receptor probes?',
        q: 'Of all the molecules assigned to those 43 T-cell-receptor probes across the whole dataset, what '
          + 'percentage lands in cells the authors labelled as T cells?',
        why: 'The number decides whether a per-cell clone analysis is possible at all. It is not in any paper '
          + 'figure; it comes from counting the deposited molecules.',
        answer: () => st.tcr_frac_in_T * 100, tol: 6, unit: '%',
        hint: 'T cells are 7% of all cells. A perfectly specific probe would be near 100%; pure background would be '
          + 'near 7%.',
        explain: 'About 18%. Better than background, far from specific — so the sum over the 43 probes is '
          + 'mostly noise, and in the two patients whose clones these are, 68% (P28) and 45% (P34) of their own '
          + 'probe counts land in T cells, against 2–10% in the other six. The usable version is one named '
          + 'probe in its own patient, never the group total.' });

      DS.mcq(body, { id: 'l7-general', title: 'The transferable rule',
        q: 'Both probe sets behaved the same way. What is the general rule?',
        shuffle: false,
        options: [
          { t: 'Before using a sparse readout, measure its rate in a group that cannot be positive, and report the '
              + 'threshold with the result', ok: true,
            why: 'This is the lesson, and it applies to any rare signal: a virus, a mutation, a clone, a receptor.' },
          { t: 'Avoid custom probes', why: 'The custom probes are the most interesting part of this panel. They just '
              + 'need calibration.' },
          { t: 'Always use the highest threshold available',
            why: 'A high threshold trades sensitivity for specificity. Choose it from a negative group, not by '
              + 'default.' },
          { t: 'Sum related probes together to gain power',
            why: 'Summing is what broke the receptor analysis: it adds background from 42 irrelevant probes.' }],
        explain: 'Both failures came from the same habit — trusting a named feature because its name matches '
          + 'the question.' });
    },
  });

  /* ---------------------------------------------------------------- lesson 8 */
  M.lessons.push({
    title: 'What would you ask this dataset?',
    summary: 'Putting it together: sorting real candidate questions into answerable and not.',
    minutes: 15,
    tags: 'Design clinic',
    goals: ['judge a proposed question against this dataset’s design before running anything',
      'name the control each surviving question still needs',
      'write down what you would need to answer the ones that fail'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'The checklist, in order', P(
        'Everything in this course collapses into five questions. Ask them in this order, because each one can end '
        + 'the discussion on its own.'));
      const ol = h('ol', { class: 'prose', style: 'max-width:70ch' },
        h('li', null, h('b', null, 'Is the readout on the panel? '),
          '480 features. No gene outside them exists here, and no model creates one.'),
        h('li', null, h('b', null, 'Does the comparison need a group the design lacks? '),
          'There is no untreated patient and no second dose.'),
        h('li', null, h('b', null, 'Could the size and run difference produce it? '),
          'PRE is a small core, POST a whole resection, sometimes on another day and software version.'),
        h('li', null, h('b', null, 'Is it bigger than the piece-to-piece floor? '),
          'Two untreated pieces of one tumour differ in state composition by up to '
          + F.num(Math.max.apply(null, st.floor.pairs.map((x) => x.tvd)), 2) + '.'),
        h('li', null, h('b', null, 'Does it survive detection and spillover controls, in how many of 8 patients? '),
          'Report the count of patients, always.'));
      body.append(ol);

      DS.match(body, { id: 'l8-which', title: 'Which check kills which question?',
        q: 'Each of these questions fails on this dataset. Match it to the first check it fails.',
        pairs: [
          ['Do tumour cells die by apoptosis more after treatment?', 'Readout is not on the panel'],
          ['Would a second dose add anything?', 'The design has no such group'],
          ['Does the tumour contain more cell types after treatment?', 'Size and sampling difference'],
          ['Did P32\u2019s mix of tumour states change after treatment?', 'Smaller than the untreated floor'],
          ['Do tumour cells touching myeloid cells carry more inflammatory genes?', 'Needs detection and spillover controls']],
        explain: 'None of these is a bad question. They are questions for a different dataset, or questions that '
          + 'need a control run first.' });

      DS.mcq(body, { id: 'l8-pick', title: 'Pick the question worth running',
        q: 'You have this dataset and one week. Which question is best matched to what it can support?',
        shuffle: false,
        options: [
          { t: 'How far from a tumour cell does its neighbours’ influence on its own gene expression reach, '
              + 'measured at several radii with detection matched and the nearest neighbours excluded?', ok: true,
            why: 'This is the dataset’s own strength — position — asked with the two controls built '
              + 'in, and it needs no untreated arm.' },
          { t: 'Which tumour state responds to the virus?',
            why: 'Needs a compartment-level before-and-after comparison, which the floor and the sampling '
              + 'asymmetry do not support here.' },
          { t: 'Does the virus make tumours more sensitive to a checkpoint inhibitor?',
            why: 'No patient in this cohort received one in a way the data records.' },
          { t: 'Which genes predict survival?',
            why: 'Eight patients, with time-to-sample varying from 15 to 801 days. Any fit would be noise.' }],
        explain: 'Match the question to the design’s strongest axis. Here that axis is space within a section, '
          + 'not change over time between two unmatched pieces.' });

      DS.block(body, 'explore', 'Free exploration', P(
        'Everything is loaded. Use the two views below to check whatever you now suspect: pick any section, any gene '
        + 'on the panel, any colouring. Good habits to practise: compare a gene against the molecules-per-cell view '
        + 'before believing a spatial pattern, and switch patients before believing anything at all.'));
      const tf = DS.figure(body);
      await M.tissueView(tf, { id: 'l8t', section: 'P34_POST', mode: 'comp' });
      const uf = DS.figure(body);
      await M.umapView(uf, { id: 'l8u', mode: 'comp', scores: true });

      DS.flashcards(body, { id: 'l8-recall', title: 'Final recall: the traps in this dataset',
        cards: [
          ['Why is 92% of the data POST?', 'POST pieces are whole resections, up to 89 mm²; PRE pieces are biopsy cores. It is tissue area, not cell density.'],
          ['What does the `batch` column control for?', 'Not the PRE-to-POST run difference: it is constant within a patient, while four patients had their two timepoints imaged on different days and software versions.'],
          ['What does "at least one viral molecule" measure?', 'Mostly background. PRE tissue, which cannot be positive, has 0.58% of cells at that threshold against 0.87% in POST.'],
          ['How specific are the 43 T-cell receptor probes?', 'About 18% of their molecules land in T cells. Only named probes in their own patient (P28, P34) carry real signal.'],
          ['Why can a tumour state label not support a claim about hypoxia genes?', 'The label was assigned by scoring those same genes. The claim restates the definition.'],
          ['How much do two untreated pieces of one tumour differ?', 'Up to 0.19 in state-composition distance, which is more than half the patients\u2019 before-and-after change, and up to 4.6 ISG molecules per 1,000.'],
          ['What is the per-cell detection field?', 'Molecules per cell varies smoothly across a section, correlating about 0.5 between neighbours, so it mimics a biological field and lifts every gene at once.'],
          ['Which findings survive every control here?', 'T cells rise in 8 of 8 patients and clear the untreated floor. Interferon-stimulated genes rise in 7 of 8, but only 2 of those rises are larger than the floor.']] });

      DS.block(body, 'concept', 'Where to take it next', P(
        'This dataset is 2.4 million cells and a very small study. Both halves are true at once, and the second half '
        + 'is the one that decides what you can claim. The habit worth keeping is the order of the checklist: panel, '
        + 'then design, then sampling, then floor, then controls — before any model is trained.'));
    },
  });

  /* ---------------------------------------------------------------- register */
  DS.courses.meylan = {
    id: 'meylan',
    title: 'Glioblastoma treated with an oncolytic virus',
    kicker: 'Meylan et al. 2026 · Xenium in situ · 8 patients',
    short: 'Tumour tissue imaged gene by gene before and after a virus was injected into it. Learn what the design '
      + 'supports, and the traps that have cost us real time.',
    facts: ['2.4 M cells', '480 genes in place', '8 patients, before and after', '19 tissue sections'],
    intro: '<p>Eight people with recurrent glioblastoma had an engineered herpes virus injected into their tumour. '
      + 'A biopsy was taken at the injection and a second piece of tissue weeks to months later. Both were imaged '
      + 'cell by cell, in place, for 480 genes — including five genes of the virus itself.</p>'
      + '<p>The course runs in one loop: predict, look at the real cells, check yourself, learn the trap. Every '
      + 'number on these pages is computed from the deposited data, not retyped from the paper, and every exercise '
      + 'answer comes from all 2.4 million cells rather than from the sample you see on screen.</p>',
    citation: 'Data: Meylan, Tian et al., <i>Cell</i> 189:1287–1304 (2026), GEO GSE296577. '
      + 'Trial: CAN-3110, Ling et al. 2023.',
    glossary: {
      glioblastoma: 'The most aggressive brain tumour. It spreads into surrounding brain rather than forming a '
        + 'removable lump, so it recurs after surgery in almost every patient.',
      'oncolytic virus': 'A virus engineered to replicate inside tumour cells and kill them, while also alerting the '
        + 'immune system to the tumour.',
      Xenium: 'A method that images a fixed panel of genes directly in intact tissue, one RNA molecule at a time, '
        + 'keeping each molecule’s position.',
      segmentation: 'Deciding which molecules belong to which cell. Here: find each nucleus, then grow the cell '
        + 'outward by 5 µm, stopping where cells meet.',
      UMAP: 'A two-dimensional map of cells placed so that cells with similar gene counts sit near each other. '
        + 'Useful for spotting populations; distances on it are not quantities.',
      hypoxia: 'Shortage of oxygen. Cells respond with a recognisable set of genes (`CA9`, `ADM`, `VEGFA`, '
        + '`HILPDA`), which makes low-oxygen regions visible in the data.',
      interferon: 'The alarm signal cells release when they detect a virus. It switches on a set of '
        + 'interferon-stimulated genes in the cells around them.',
    },
    overviewFigure: (el) => { M.umapView(el, { id: 'ov', mode: 'comp', controls: false, labels: true,
      caption: 'All 11 cell populations, from the authors’ own map. You will take this apart in lesson 3.' }); },
    heroFigure: (el) => { M.heroPlot(el); },
    lessons: M.lessons,
  };
})();
