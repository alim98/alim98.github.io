/* Meylan course: lesson 3 (cell types from markers) and lesson 4 (tumour cell states). */
(function () {
  'use strict';
  const DS = window.DS, h = DS.h, F = DS.fmt;
  const M = DS.meylan;
  const P = (html) => DS.prose(html);

  /* ---------------------------------------------------------------- lesson 3 */
  M.lessons.push({
    title: 'Telling the cells apart',
    summary: 'How a cell gets a label, which labels exist here, and how unevenly they are spread.',
    minutes: 15,
    tags: 'Cell types · markers',
    goals: ['name the cell populations in this tumour and the genes that identify them',
      'read a dot plot and a UMAP without being misled by either',
      'say how a label is produced, and what that makes it unsuitable for'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'A label is a conclusion, not an observation', P(
        'The dataset does not observe "T cell". It observes counts of 480 genes. Someone then groups cells with '
        + 'similar counts together and gives each group the name of the cell type whose marker genes it carries. '
        + 'The authors did this twice: a coarse pass with 11 types, and a finer pass that splits the tumour cells '
        + 'into states and the T cells into states.'
        + '<p>So a label is a summary of the same numbers you are about to analyse. Useful, and also a trap we will '
        + 'come back to.</p>'));

      const dotFig = DS.figure(body);
      DS.dotplot(dotFig, st.dot_tier1, { label: 'Marker genes by cell type', labelW: 185 });
      dotFig.cap('Real data, all ' + F.int(st.n_cells) + ' cells. Each row is one of the authors’ 11 cell types, '
        + 'each column a gene. Dot size is the share of cells of that type with at least one molecule of the gene; '
        + 'colour is the mean level, scaled within each column so that columns can be compared by shape, not by '
        + 'brightness.');

      DS.match(body, { id: 'l3-markers', title: 'Match the marker to the cell',
        q: 'Use the dot plot above. Which cell type does each gene mark most strongly?',
        pairs: [['`CD3E`, `CD8A`', 'T cells'], ['`CD163`, `CD68`', 'Macrophages/monocytes'],
          ['`SOX2`, `OLIG2`', 'Tumour cells'], ['`RGS5`, `ACTA2`', 'Vasculature'],
          ['`IGKC`, `JCHAIN`', 'Plasma cells'], ['`S100A9`, `CXCR2`', 'Neutrophils']],
        extra: ['Stromal cells', 'B cells'],
        explain: 'These six pairs are the ones you will use constantly on this dataset. Notice that no marker is '
          + 'clean: every gene has smaller dots in several other rows.' });

      DS.block(body, 'explore', 'The same cells as a map of similarity', P(
        'A [[UMAP]] places each cell on a flat map so that cells with similar counts sit close together. It is the '
        + 'standard first look at a dataset like this. Colour it by cell type, then by patient, then by a single '
        + 'gene, and watch where the structure comes from.'));
      const uf = DS.figure(body);
      const um = await M.umapView(uf, { id: 'l3', mode: 'comp' });

      DS.predict(body, { id: 'l3-patient', title: 'Predict: where do patients sit on this map?',
        kind: 'choice',
        q: 'Switch the view above to colour by <b>Patient</b>. What do you expect to see?',
        choices: ['Each patient forms its own separate island',
          'Patients are mixed together inside each cell type',
          'Only the tumour cells separate by patient, the immune cells mix'],
        reveal: (el, guess) => {
          um.setMode('patient');
          el.append(h('div', { class: 'feedback info', html:
            'Look at the plot above, now coloured by patient. The eight patients are <b>mixed inside every '
            + 'population</b>, including the tumour cells. Measured on the nearest 15 neighbours of each cell, '
            + 'about 21% of a tumour cell’s neighbours come from its own patient, against 12% expected if '
            + 'patients were mixed at random; for immune cells it is 17–18%. There is a patient signal, but it '
            + 'is weak on this map.' }));
          el.append(P('<p class="small">Treat that as a fact about this map, not about the tumours. In most '
            + 'single-cell tumour data, tumour cells separate by patient almost completely, and this object also '
            + 'carries a batch-corrected embedding, so some of the mixing you see was put there by a correction '
            + 'step. Before studying how patients differ, check which embedding you are standing on: a corrected '
            + 'one may have removed the very difference you are looking for.</p>'));
          return guess === 1;
        } });

      DS.block(body, 'trap', 'What a UMAP does not tell you', P(
        'Distances on a UMAP are not quantities. Two blobs sitting far apart may differ by a handful of genes, and '
        + 'the empty space between them is an artefact of the layout. Use the map to find populations; use counts and '
        + 'tests to say how much anything differs.'));

      DS.block(body, 'concept', 'The populations are wildly unequal', P(
        'Cell-type shares matter for every later calculation, because a type with few cells cannot support a '
        + 'per-patient comparison, no matter how many cells the dataset has in total.'));
      const shareFig = DS.figure(body);
      DS.hbars(shareFig, st.tier1.map((t, k) => ({ label: t.replace('Tumor', 'Tumour'),
        v: st.cell_share_tier1[k], color: 'var(--c1)' })),
        { labelW: 165, width: 620, fmt: (v) => F.pct(v, 2), label: 'Share of all cells by type' });
      shareFig.cap('Share of all ' + F.int(st.n_cells) + ' cells. Two thirds of the dataset is tumour cells; dendritic '
        + 'cells and NK cells together are '
        + F.pct(st.cell_share_tier1[st.tier1.indexOf('Dendritic cells')]
          + st.cell_share_tier1[st.tier1.indexOf('NK cells')], 2) + ' of it.');

      const nDC = st.samples_info.P51_pre.tier1[st.tier1.indexOf('Dendritic cells')];
      DS.predict(body, { id: 'l3-dc', title: 'Can you study dendritic cells here?',
        q: 'Dendritic cells carry tumour material to T cells, so they matter here, and they are '
          + F.pct(st.cell_share_tier1[st.tier1.indexOf('Dendritic cells')], 2) + ' of all cells in the dataset. '
          + 'How many of them do you expect to find in the <b>smallest sample</b> (P51 PRE, '
          + F.int(st.samples_info.P51_pre.n) + ' cells)?',
        why: 'Deciding whether a cell type is studiable per patient, before building anything, saves weeks.',
        min: 0, max: 40, step: 1, value: 15, fmt: (v) => v + ' cells',
        reveal: (el, guess) => {
          el.append(h('div', { class: 'feedback info', html:
            'You guessed <b>' + guess + '</b>. The real number is <b>' + nDC + '</b>. The dataset-wide share would '
            + 'predict about ' + Math.round(st.cell_share_tier1[st.tier1.indexOf('Dendritic cells')]
              * st.samples_info.P51_pre.n) + ', but a small biopsy does not hold an average slice of the tumour, '
            + 'and rare types are where that bites.' }));
          el.append(P('<p class="small">One cell cannot carry a per-patient comparison. You can pool patients and '
            + 'give up showing consistency, or group dendritic cells with the other myeloid cells and give up the '
            + 'distinction. This is a property of the dataset, and no method fixes it.</p>'));
          return Math.abs(guess - nDC) <= 4;
        } });

      DS.block(body, 'explore', 'Finding a rare population by hand', P(
        'T cells are 7% of all cells, but they are not spread evenly: in one PRE biopsy they are 1 in a thousand. '
        + 'Switch the tissue map below to the <b>Gene</b> view and pick <span class="gene">CD2</span> or '
        + '<span class="gene">CD3E</span>, then switch to <b>Cell type</b> and focus the legend on T and NK cells. '
        + 'You are doing by eye what the labelling algorithm did with all 480 genes at once.'));
      const tf = DS.figure(body);
      await M.tissueView(tf, { id: 'l3t', section: 'P28_POST', mode: 'comp',
        modes: [['comp', 'Cell type'], ['tcell', 'T-cell state'], ['gene', 'Gene']], gene: 'CD2',
        caption: 'Try `CD3E` (clean but sparse) against `GFAP` (abundant, everywhere).' });
      tf.cap('P28 POST, the section with the highest T-cell share in the dataset ('
        + F.pct(st.samples_info.P28_post.tier1[st.tier1.indexOf('T cells')] / st.samples_info.P28_post.n, 1)
        + ' of cells). Even here, T cells sit in patches rather than spread out.');

      DS.mcq(body, { id: 'l3-sparse', title: 'Why one marker is not enough',
        q: 'In the gene view, `CD3E` marks T cells but most T cells show zero molecules of it. Why?',
        options: [
          { t: 'Each cell holds few molecules in total, so a moderately expressed gene is often simply not detected',
            ok: true,
            why: 'Right. Median cell depth here is of the order of a hundred molecules across all 480 genes, so a '
              + 'gene at a few copies per cell is frequently zero.' },
          { t: 'The `CD3E` probe failed', why: 'It works: `CD3E` is the strongest T-cell marker in the dot plot.' },
          { t: 'Those cells are not really T cells',
            why: 'Possible for a few, but the pattern holds for the clear T cells too.' },
          { t: 'Because the tissue was preserved in wax',
            why: 'Preservation lowers the overall yield, but the zeros are mainly the sampling of few molecules.' }],
        explain: 'A zero here means "not seen", not "not expressed". That is why labels are built from many genes at '
          + 'once, and why single-gene thresholds on single cells are unreliable.' });
    },
  });

  /* ---------------------------------------------------------------- lesson 4 */
  M.lessons.push({
    title: 'States inside the tumour',
    summary: 'The tumour cells are not one thing. What the four state families mean and how they are assigned.',
    minutes: 15,
    tags: 'Tumour states · circularity',
    goals: ['describe the four tumour-cell state families and the genes behind them',
      'find the hypoxic state in real tissue and say what it marks',
      'explain why a state label must not be used as independent evidence about its own genes'],
    async build(body) {
      const st = await M.stats();
      DS.block(body, 'concept', 'One tumour, several programmes', P(
        'Glioblastoma cells of a single tumour do not all behave alike. They sit in a handful of recurring '
        + 'programmes, named after the normal brain cells they resemble:'
        + '<ul>'
        + '<li><b>AC-like</b> — resembles astrocytes, the supporting cells of the brain (`GFAP`, `SPARCL1`).</li>'
        + '<li><b>OPC-like</b> and <b>NPC-like</b> — resemble immature cells that would normally become '
        + 'oligodendrocytes or neurons (`OLIG1`, `PDGFRA`, `DCX`, `SOX4`). The dividing cells are mostly here.</li>'
        + '<li><b>MES-like</b> — "mesenchymal": a stress and wound-like programme (`CHI3L1`, `CD44`, `VIM`). '
        + 'MES-like 2 is the [[hypoxia|low-oxygen]] version, carrying `CA9`, `ADM`, `VEGFA` and `HILPDA`.</li></ul>'
        + 'A cell can move between these programmes; they are states, not separate lineages.'));

      const dotFig = DS.figure(body);
      DS.dotplot(dotFig, st.dot_states, { label: 'State genes by tumour state', labelW: 185,
        rename: (t) => t.replace('Tumor ', '') });
      dotFig.cap('All ' + F.int(st.cell_share_tier1[0] * st.n_cells) + ' tumour cells. The hypoxia genes in the bottom row are the sharpest block: MES-like 2 is the easiest '
        + 'state to recognise, and the only one tied to a physical condition you can point at in the tissue.');

      DS.block(body, 'explore', 'Where the hypoxic state sits', P(
        'Scores and labels are abstractions. The tissue is not. Below is a whole PRE section; colour it by tumour '
        + 'state, then by the gene <span class="gene">CA9</span>, which cells switch on when oxygen runs low.'));
      const tf = DS.figure(body);
      const tv = await M.tissueView(tf, { id: 'l4t', section: 'P28_PRE', mode: 'comp',
        modes: [['comp', 'Cell type'], ['state', 'Tumour state'], ['gene', 'Gene']], gene: 'CA9',
        caption: 'Compare `CA9` with `VEGFA` and `GFAP`.' });
      tf.cap(F.pct(st.sections.P28_PRE.tier2[5] / st.sections.P28_PRE.tier2.slice(0, 6).reduce((a, b) => a + b, 0), 0)
        + ' of the tumour cells in this piece are called MES-like 2. Watch where they sit relative to the edge of '
        + 'the tissue and to the vessels.');

      DS.predict(body, { id: 'l4-hypoxia', title: 'Predict: how is hypoxia arranged?',
        kind: 'choice',
        q: 'The map above is coloured by cell type, so the states are still hidden. Once you colour by state, '
          + 'how do you expect the MES-like 2 (hypoxia) cells to be arranged?',
        choices: ['Scattered evenly among the other tumour cells',
          'Gathered in patches that take up one part of the piece',
          'In thin rings, one around each blood vessel'],
        reveal: (el, guess) => {
          tv.setMode('state');
          el.append(h('div', { class: 'feedback info', html:
            'The view has switched to tumour state. The hypoxic cells sit in <b>patches</b>, here along one '
            + 'margin of the large piece rather than ringing individual vessels. That is the point: oxygen is a '
            + 'property of a place, so a state driven by oxygen is organised in space, at the scale of a region. '
            + 'Colour by `CA9` and the same patches appear straight from the raw gene, with no labelling step '
            + 'involved.' }));
          el.append(P('<p class="small">This is the strongest spatial structure in the dataset and a useful positive '
            + 'control: a method that claims to find spatial organisation should find this before you believe '
            + 'anything subtler it reports.</p>'));
          return guess === 1;
        } });

      DS.block(body, 'trap', 'The label is made of the genes you want to test', P(
        'Both the state labels and a module score for each programme sit in the data, so you can check how they '
        + 'relate. Scoring a cell means averaging the expression of that programme\'s genes. The label is '
        + '<b>not</b> just the highest-scoring programme: per cell the two agree only '
        + F.pct(st.label_from_scores.agree, 0) + ' of the time (AC-like '
        + F.pct(st.label_from_scores.per_state['Tumor AC-like'], 0) + ', MES-like 1 only '
        + F.pct(st.label_from_scores.per_state['Tumor MES-like 1'], 0) + '). That is the signature of a '
        + 'cluster-level call: cells were grouped first, and each group was named after the programme it scores '
        + 'highest on as a group.'
        + '<p>That does not rescue you. Both the grouping and the naming come out of the same 480 counts you are '
        + 'about to analyse, so the MES-like 2 label still <i>means</i> "these cells carried relatively high '
        + '`CA9`, `ADM`, `VEGFA`, `HILPDA`".</p>'
        + '<p>So these two sentences are not findings:</p>'
        + '<ul><li>"Hypoxia genes are higher in MES-like 2 cells."</li>'
        + '<li>"After treatment, cells that shifted to MES-like 2 raised their hypoxia genes."</li></ul>'
        + 'Both are restatements of the label’s definition. The circle is easy to miss once the label has a '
        + 'biological name and sits in a column called `tier2`.'));

      DS.mcq(body, { id: 'l4-circular', title: 'Which of these is circular?',
        q: 'Which statements could be true findings on this dataset, and which only repeat how the labels were '
          + 'built? Select the ones that are <b>circular</b>.',
        multi: true,
        why: 'We have had to withdraw written claims for exactly this reason. Catching it in a sentence is much '
          + 'cheaper than catching it in a draft.',
        options: [
          { t: '"MES-like 2 cells express more `CA9` than AC-like cells."', ok: true,
            why: 'Circular: `CA9` is one of the genes that assigns the label.' },
          { t: '"MES-like 2 cells are closer to each other in the tissue than expected by chance."',
            why: 'Not circular: position was never used to assign the state. This is a real, testable claim.' },
          { t: '"Patients with more MES-like 2 cells have shorter survival."',
            why: 'Not circular: survival is outside the data the label was built from. Whether 8 patients can '
              + 'support it is a separate problem.' },
          { t: '"The hypoxia module score is higher in MES-like 2 cells than in other tumour cells."',
            ok: true, why: 'Circular: the score is built from the genes that named the group.' },
          { t: '"Immune cells next to MES-like 2 tumour cells carry more inflammatory genes."',
            why: 'Not circular, since the immune cell’s own genes were not used to label the tumour cell. '
              + 'It does need a spillover control, which is lesson 5.' }],
        explain: 'The test is simple: write down which numbers produced the label, and check whether your claim '
          + 'involves only those numbers. If so, you have described the definition, not the tumour.' });

      DS.block(body, 'explore', 'Scores and labels side by side', P(
        'The module scores the authors used are in the data, so you can see the step from score to label. Open the '
        + '<b>State score</b> menu below and compare the AC and MES2 scores against the state colouring. Many cells '
        + 'carry two programmes at once; the label keeps only the winner.'));
      const uf = DS.figure(body);
      await M.umapView(uf, { id: 'l4', mode: 'state', scores: true,
        modes: [['state', 'Tumour state'], ['comp', 'Cell type'], ['gene', 'Gene']], gene: 'CA9',
        caption: 'Colour by the MES2 score, then by the MES-like 2 label, and look at the cells that score '
          + 'moderately on both AC and MES2.' });
      uf.cap('Discretising a gradient into six names is a choice. It makes counting easy and makes small shifts look '
        + 'like cells changing identity.');

      DS.flashcards(body, { id: 'l4-states', title: 'The state vocabulary',
        cards: [
          ['AC-like', 'Astrocyte-like tumour state. Markers `GFAP`, `SPARCL1`, `NDRG2`. The most common state here.'],
          ['OPC-like / NPC-like', 'Progenitor-like tumour states. `OLIG1`, `PDGFRA`, `DLL3` for OPC/NPC1; `DCX`, `STMN2`, `SOX11` for NPC2. Most dividing cells sit here.'],
          ['MES-like 1', 'Mesenchymal, inflammatory flavour: `CHI3L1`, `C1S`, `CCL2`. Often near immune cells.'],
          ['MES-like 2 (hypoxia)', 'Low-oxygen flavour: `CA9`, `ADM`, `VEGFA`, `HILPDA`. Sits in patches around poorly supplied tissue.'],
          ['Module score', 'The average expression of a gene list in one cell, used to rank cells for a programme. The state label is the highest-scoring programme.'],
          ['Circular evidence', 'Using a label to support a claim about the genes that defined it.']] });
    },
  });
})();
