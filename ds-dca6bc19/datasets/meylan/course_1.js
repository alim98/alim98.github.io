/* Meylan course: lesson 1 (the study) and lesson 2 (how the measurement works). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;
  M.lessons = M.lessons || [];
  const P = (html) => DS.prose(html);

  /* ---------------------------------------------------------------- lesson 1 */
  M.lessons.push({
    title: 'The study behind the data',
    summary: 'Who the patients were, what was done to them, and what each one contributes to the files.',
    minutes: 10,
    tags: 'Design · vocabulary',
    goals: ['say what each row and each file in this dataset represents',
      'explain why there are exactly two tissue pieces per patient',
      'name the one thing that was deliberately changed between them'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'A virus used as a drug', P(
        'The tissue in this dataset comes from a clinical trial in [[glioblastoma|glioblastoma]], the most aggressive '
        + 'brain tumour. These eight patients had already relapsed after standard treatment. They were given '
        + '<b>CAN-3110</b>, a herpes virus engineered so that it copies itself inside tumour cells but not in healthy '
        + 'brain. A virus used this way is called an [[oncolytic virus]].'
        + '<p>The hope is two separate effects. The virus kills tumour cells directly as it replicates. It also makes '
        + 'the tumour look infected, and an infected tumour draws in immune cells that were ignoring it. The second '
        + 'effect is the interesting one, and it is the reason this tissue was measured cell by cell.</p>'));
      const dia = DS.figure(body);
      M.trialDiagram(dia, st);
      dia.cap('Each patient gives one piece of tissue before the injection and one after. Nothing else about the '
        + 'treatment differs between patients in a way the data records.');

      DS.block(body, 'concept', 'What one patient contributes', P(
        'Surgeons took a small biopsy, injected the virus into the tumour, and closed. Weeks to months later the '
        + 'patient had a second operation, and that tissue was collected too. The two pieces are the whole design:'
        + '<ul><li><b>PRE</b> — a biopsy core taken at the moment of injection. Before any effect of the virus.</li>'
        + '<li><b>POST</b> — a resection or an autopsy specimen, taken 15 to 801 days later.</li></ul>'
        + 'Eight patients × two timepoints = 16 samples. Two patients had their PRE biopsy cut into several pieces, '
        + 'so the files hold 19 tissue sections with labelled cells (a 20th, a second P34 piece, carries none). '
        + 'Together they contain ' + F.int(st.n_cells) + ' cells that passed quality control.'));

      DS.mcq(body, { id: 'l1-row', title: 'What is a row?',
        q: 'In the main table of this dataset, what does one row stand for?',
        why: 'Every later question — how many cells of a type, how much of a gene — is a count over rows. If you '
          + 'mistake what a row is, every number you compute means something else.',
        options: [
          { t: 'One cell, with the molecules counted inside it', ok: true,
            why: 'Right: 2.4 million rows, one per cell that passed quality control.' },
          { t: 'One patient', why: 'There are only 8 patients but 2.4 million rows.' },
          { t: 'One tissue section', why: 'There are 19 sections.' },
          { t: 'One gene', why: 'Genes are the columns here: 480 of them.' }],
        explain: 'The table is cells (rows) × measured features (columns). Patient, timepoint and section are '
          + 'properties attached to each cell.' });

      DS.order(body, { id: 'l1-order', title: 'Put the study in order',
        q: 'Order these events as they happened for one patient.',
        items: ['Surgeons take a small biopsy — this becomes the PRE sample',
          'The virus is injected into the tumour',
          'Weeks to months pass, with standard care',
          'A second operation removes more tumour — this becomes the POST sample',
          'Both pieces are preserved, sliced and measured on the same instrument'],
        explain: 'The biopsy comes first because the surgeon must reach the tumour before injecting it. That is why '
          + 'PRE pieces are small and POST pieces are large — a fact that will matter in lesson 6.' });

      DS.block(body, 'trap', 'One injection, two pieces of tissue', P(
        'Write the design down in plain words, because it limits everything: <b>one treatment, given once, with one '
        + 'piece of tissue before and one after, in eight people.</b> There is no untreated control patient, no '
        + 'second dose, and no repeat sample from the same day. Every claim you ever make on this dataset has to '
        + 'survive that sentence.'));

      DS.mcq(body, { id: 'l1-control', title: 'What is missing',
        q: 'Suppose you see more T cells in POST than in PRE for a patient. Which comparison would tell you whether '
          + 'the virus caused it? Choose all that apply.',
        multi: true,
        why: 'This is the question we will answer with real numbers in lesson 6. Deciding what you would need '
          + 'before you see the result is how you avoid talking yourself into one.',
        options: [
          { t: 'A second untreated piece from the same tumour, measured the same way', ok: true,
            why: 'Yes. It shows how much two pieces of one tumour differ with no treatment at all.' },
          { t: 'A patient who had two operations but no virus', ok: true,
            why: 'Yes. This is the control arm the trial did not have.' },
          { t: 'More cells from the same POST section',
            why: 'More cells from the same piece make the number steadier, but they cannot tell you whether a '
              + 'different piece would have looked the same.' },
          { t: 'The same comparison in the other seven patients',
            why: 'This shows the direction is consistent, which matters, but every one of them is treated and '
              + 'went from a biopsy to a resection too. Repeating a comparison does not supply its control.' }],
        explain: 'Only an untreated comparison fixes the baseline. Lesson 6 measures it from the few patients whose '
          + 'biopsy was split into several pieces.' });

      DS.flashcards(body, { id: 'l1-vocab', title: 'Vocabulary for the rest of the course',
        cards: [
          ['Glioblastoma', 'The most aggressive brain tumour. It grows into the brain rather than as a lump that can be fully cut out, so it almost always comes back.'],
          ['Oncolytic virus', 'A virus engineered to copy itself in tumour cells and kill them, while also making the tumour visible to the immune system.'],
          ['CAN-3110', 'The engineered herpes virus used in this trial. Injected once, directly into the tumour.'],
          ['PRE / POST', 'The tissue piece taken at injection, and the piece taken at the later operation.'],
          ['Resection', 'Surgical removal of tumour tissue. Gives a much larger piece than a biopsy.'],
          ['FFPE', 'Tissue preserved in wax. Keeps the architecture, but the RNA is broken into short pieces, which limits which methods can be used.']] });
    },
  });

  /* ---------------------------------------------------------------- lesson 2 */
  M.lessons.push({
    title: 'How the cells were measured',
    summary: 'Imaging 480 genes in place, one molecule at a time, and how molecules become cell counts.',
    minutes: 15,
    tags: 'Measurement · segmentation',
    goals: ['explain where the numbers in the table come from',
      'say what the gene panel can and cannot see',
      'predict how the counts change when cell boundaries are drawn differently'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'Why not just sequence it', P(
        'The usual way to measure RNA in a tumour is to break the tissue apart, capture single cells, and sequence '
        + 'everything they contain. You get all ~20,000 genes, but you lose the map: once the tissue is a suspension, '
        + 'you can no longer tell which cell was next to which.'
        + '<p>This study used the opposite trade. The tissue stays intact on the slide, and a microscope reads a fixed '
        + 'list of genes molecule by molecule, in place. The method is [[Xenium]]. You keep the map and the exact '
        + 'position of every molecule; you give up the rest of the genome.</p>'));

      DS.match(body, { id: 'l2-tradeoff', title: 'Which method answers which question',
        q: 'For each question, choose the method that can answer it.',
        pairs: [
          ['Which genes, out of all 20,000, separate two tumours?', 'Dissociate and sequence'],
          ['Are T cells touching tumour cells or sitting in vessels?', 'Image genes in place'],
          ['Is a gene that is not on the panel switched on?', 'Dissociate and sequence'],
          ['Is a dying region next to a blood vessel?', 'Image genes in place']],
        explain: 'This dataset is the second kind. Any question about a gene outside the panel is unanswerable here, '
          + 'no matter how good your model is.' });

      DS.block(body, 'concept', 'The panel is a choice someone made', P(
        `Only ${st.n_features} features were measured: ${st.n_genes_named} real genes, `
        + `${st.n_tcr} probes for individual T-cell receptors, and ${st.n_hsv} probes for genes of the virus itself. `
        + 'The genes are not a random sample. They are a commercial immune-and-cancer panel plus a custom add-on this '
        + 'lab chose for brain tumours. So the panel tells you what the authors expected to find: immune cell types, '
        + 'tumour cell states, hypoxia, interferon signalling, and the virus.'));

      const pf = DS.figure(body);
      const counts = {};
      st.panel.forEach((r) => (counts[r.cat] = (counts[r.cat] || 0) + 1));
      DS.hbars(pf, Object.keys(counts).map((k, i) => ({ label: k.replace(' (custom)', ''), v: counts[k],
        color: `var(--c${i + 1})`, note: k.indexOf('custom') > 0 ? 'custom add-on' : '' })),
        { labelW: 215, width: 620, fmt: (v) => v + ' probes', label: 'Panel composition' });
      pf.cap('What the 480 measured features are. The custom add-on is where the brain-tumour genes, the virus genes '
        + 'and the patient-specific T-cell receptor probes live.');

      DS.mcq(body, { id: 'l2-nopanel', title: 'A question the panel cannot answer',
        q: 'You want to count tumour cells that are actively dying by apoptosis, which you would normally read from '
          + 'caspase genes. What does this dataset let you do?',
        why: 'We lost real time on this exact point: a question was designed around apoptosis before anyone checked '
          + 'the panel for the genes it needs.',
        options: [
          { t: 'Nothing — no caspase or other apoptosis-execution gene is on the panel, so the readout does not exist here',
            ok: true, why: 'Correct. Check the panel list before designing the question, not after.' },
          { t: 'Use a model to impute the caspase genes from the 480 measured ones',
            why: 'Imputation invents the readout from the genes you did measure. It cannot be checked here, and a '
              + 'number that cannot be checked is not a measurement.' },
          { t: 'Use total molecule count as a proxy for dying cells',
            why: 'Low counts happen in dying cells, in poorly preserved tissue and at the edge of a section. The '
              + 'proxy mixes all three.' },
          { t: 'Use the MES-like 2 state, which includes hypoxia genes',
            why: 'Hypoxia and apoptosis are related but not the same. A cell can sit in a low-oxygen region for days '
              + 'without dying.' }],
        explain: 'The honest answer to a missing readout is a different dataset, or a different question. Protein '
          + 'staining of the same trial does carry an apoptosis marker, but it is a separate deposit with different '
          + 'tissue sections.' });

      DS.block(body, 'concept', 'From molecules to a table of counts', P(
        'The instrument gives a list of molecules, each with a gene name and a position. To get a table of cells × '
        + 'genes, software has to decide which molecule belongs to which cell. It finds each nucleus in the image, '
        + 'then grows the cell outward from it by a fixed distance — here <b>5 µm</b>, stopping where two cells meet. '
        + 'Every molecule inside that boundary is counted in that cell. This step is called [[segmentation]].'
        + '<p>Below is a real 110 µm square of tissue, with every molecule the instrument decoded. Move the slider to '
        + 'change how far cells reach, and watch the counts change.</p>'));

      const labBox = DS.figure(body);
      const lab = await M.moleculeLab(labBox, { d: 0, gene: 'GFAP' });
      const f0 = lab.fracIn(0), f5 = lab.fracIn(5);

      DS.predict(body, { id: 'l2-pred-assign', title: 'Predict before you look',
        q: 'The view above opens with cells limited to their nuclei, at 0 µm, where '
          + F.pct(f0, 1) + ' of the molecules are counted in a cell. Before you move the slider: at the standard '
          + '5 µm expansion, what share of the molecules in that square end up inside some cell?',
        min: 10, max: 100, step: 5, value: 60, fmt: (v) => v + '%',
        reveal: (el, guess) => {
          el.append(h('div', { class: 'feedback info', html:
            `You guessed <b>${guess}%</b>. The real value is <b>${F.pct(f5, 1)}</b> at 5 µm, up from `
            + `<b>${F.pct(f0, 1)}</b> at the nucleus. Move the slider to see it. So even at the standard setting, `
            + 'roughly a quarter of all molecules in this tissue are counted in <b>no cell at all</b>, and are '
            + 'simply dropped from the table.' }));
          el.append(DS.prose('Two things follow. Cell counts are not the tissue’s full RNA content, they are the '
            + 'part that fell inside a boundary someone drew. And the boundary is a setting: a different expansion '
            + 'gives a different table from identical raw data.', 'small'));
          return Math.abs(guess - f5 * 100) <= 12;
        } });

      DS.numeric(body, { id: 'l2-gfap', title: 'Where a tumour gene lands',
        q: 'In the view above, follow <span class="gene">GFAP</span> — a gene made by tumour cells of the astrocyte-'
          + 'like kind. At 5 µm, how many <span class="gene">GFAP</span> molecules are counted inside <b>T or NK '
          + 'cells</b> in this square? Read it off the panel under the plot.',
        why: 'A gene from one cell type showing up inside another is the single most common way a spatial result '
          + 'turns out to be an artefact. Seeing the raw amount here makes it concrete.',
        answer: () => lab.countIn('GFAP', 2, 5), tol: 0.5, unit: 'molecules',
        hint: 'Set the slider to 5 µm and the "Follow" menu to GFAP, then read the "GFAP in T / NK cells" tile.',
        fmt: (v) => v,
        explain: 'Those molecules are mostly not T-cell biology. A `GFAP` molecule made by a neighbouring tumour cell '
          + 'that drifts a micrometre across a boundary is counted in the T cell, and nothing in the table marks it '
          + 'as borrowed. The effect is called spillover, and it is strongest for genes expressed at high levels '
          + 'right next to the cell you care about.' });

      DS.block(body, 'concept', 'Controls that tell you about the noise', P(
        'The panel also contains probes for sequences that do not exist in human tissue. Any molecule assigned to '
        + 'one of them is a decoding error, so these negative controls measure the instrument’s own background. '
        + `In the square above there are ${F.int(lab.nNegative())} such molecules out of ${F.int(lab.w.n)}, and `
        + `${F.int(lab.nFiltered)} more molecules were dropped before that for low decoding quality. Background is `
        + 'low, which is exactly why it is worth checking: when you later see a faint signal, you want to know what '
        + 'faint means on this instrument.'));

      DS.mcq(body, { id: 'l2-seg-consequence', title: 'What segmentation changes',
        q: 'You repeat an analysis with cells grown 2 µm instead of 5 µm. Which results could change? Choose all '
          + 'that apply.',
        multi: true,
        options: [
          { t: 'How many molecules each cell has', ok: true, why: 'Directly: smaller cells catch fewer molecules.' },
          { t: 'Which cell type a borderline cell is called', ok: true,
            why: 'Yes. Type calls come from the counts, so changing the counts can change the call.' },
          { t: 'How much a marker of one cell type appears in another type', ok: true,
            why: 'Yes. This is the main reason to try a tighter boundary.' },
          { t: 'The positions of the nuclei',
            why: 'Nuclei are found from the image, independently of the expansion.' },
          { t: 'Which genes are on the panel', why: 'The panel was fixed before the tissue was imaged.' }],
        explain: 'Treat segmentation as part of your analysis, not as part of the data. If a result would flip at a '
          + 'different expansion, it is a result about the boundary.' });
    },
  });
})();
