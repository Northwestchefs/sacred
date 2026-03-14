import { breakdownByLetter, calculateGematria } from './gematria.js';
import { analyzeDivineName } from './divine-names.js';
import {
  mapDivineNameToSefirot,
  mapDivineNamesToSefirot,
  mapGematriaToSefirot,
  SEFIROT,
} from './sefirot-map.js';
import { findResonantVerses, calculatePhraseGematria } from './tools/resonance-engine.js';
import { analyzePsalm } from './tools/psalm-analyzer.js';
import { generate72Names } from './tools/72names.js';
import { generate231Gates } from './tools/231gates.js';
import { analyzeVerse } from '../modules/mystical-pipeline.js';
import { highlightSefirot } from '../components/tree-of-life.js';

const NODE_COORDINATES = {
  Keter: [150, 40],
  Chokhmah: [95, 100],
  Binah: [205, 100],
  Chesed: [75, 200],
  Gevurah: [225, 200],
  Tiferet: [150, 160],
  Netzach: [115, 280],
  Hod: [185, 280],
  Yesod: [150, 320],
  Malkhut: [150, 380],
};

async function injectComponent(targetSelector, path) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load component: ${path}`);
  target.innerHTML = await response.text();
}

function renderTreeNodes() {
  const group = document.getElementById('tree-sefirot-nodes');
  if (!group) return;

  group.innerHTML = SEFIROT.map((name) => {
    const [x, y] = NODE_COORDINATES[name];
    return `
      <g data-sefirah="${name}" data-state="inactive">
        <circle cx="${x}" cy="${y}" r="18" fill="#f7f6f2" stroke="#2c4a6f" />
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8">${name}</text>
      </g>
    `;
  }).join('');
}

function initVerseMysticalPipeline() {
  const form = document.getElementById('verse-viewer-form');
  const refInput = document.getElementById('verse-reference-input');
  const status = document.getElementById('verse-viewer-status');
  const hebrew = document.getElementById('verse-hebrew-text');
  const english = document.getElementById('verse-english-text');
  const commentaryList = document.getElementById('verse-commentary-links');

  const gematriaTotal = document.getElementById('gematria-total');
  const gematriaBreakdown = document.getElementById('gematria-breakdown');
  const divineNameOutput = document.getElementById('divine-name-output');
  const divineNamePermutations = document.getElementById('divine-name-permutations');

  if (!form || !refInput || !status) return;

  const renderCommentary = (items = []) => {
    if (!commentaryList) return;
    commentaryList.innerHTML = items.length
      ? items
          .map(
            (item) =>
              `<li><strong>${item.commentator}</strong> · ${item.sourceRef}<br /><em>${item.text || 'No excerpt available.'}</em></li>`,
          )
          .join('')
      : '<li>No classical commentary found for this verse.</li>';
  };

  const renderGematria = (analysis) => {
    if (gematriaTotal) {
      gematriaTotal.textContent = `Total: ${analysis.total} · Mispar Katan: ${analysis.reduced} · Mispar Gadol: ${analysis.finalLetterSystem}`;
    }

    if (gematriaBreakdown) {
      gematriaBreakdown.innerHTML = analysis.breakdown.length
        ? analysis.breakdown.map((row) => `<li><strong>${row.letter}</strong> = ${row.value}</li>`).join('')
        : '<li>No Hebrew letters detected.</li>';
    }
  };

  const renderDivineNames = (analysis) => {
    if (divineNameOutput) {
      const names = analysis.namesDetected.length ? analysis.namesDetected.join(', ') : 'none';
      const values = analysis.gematriaValues.map((item) => `${item.name}=${item.value}`).join(' · ') || '—';
      divineNameOutput.textContent = `Detected: ${names} · Gematria: ${values}`;
    }

    if (divineNamePermutations) {
      divineNamePermutations.innerHTML = analysis.permutations.length
        ? analysis.permutations
            .slice(0, 24)
            .map((item) => `<li>${item.name}: ${item.value}</li>`)
            .join('')
        : '<li>No divine-name permutations for this verse.</li>';
    }
  };

  async function run(reference) {
    status.textContent = `Analyzing ${reference}…`;
    try {
      const result = await analyzeVerse(reference);

      if (hebrew) hebrew.textContent = result.verse.hebrew || 'Hebrew text unavailable.';
      if (english) english.textContent = result.verse.english || 'English translation unavailable.';

      renderGematria(result.gematria);
      renderDivineNames(result.divineNames);
      renderCommentary(result.commentary);

      const sefirahList = [result.sefirot.primarySefirah, ...result.sefirot.secondarySefirot].filter(Boolean);
      highlightSefirot(sefirahList, { animateFlow: true });

      status.textContent = `Loaded ${result.verse.reference}. Primary sefirah: ${result.sefirot.primarySefirah} (confidence ${result.sefirot.confidenceScore}).`;

      document.dispatchEvent(
        new CustomEvent('mystical:analysis-complete', {
          detail: result,
        }),
      );
    } catch (error) {
      status.textContent = `Unable to analyze ${reference}: ${error.message}`;
      if (hebrew) hebrew.textContent = '';
      if (english) english.textContent = '';
      renderCommentary([]);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const reference = refInput.value.trim();
    if (!reference) {
      status.textContent = 'Enter a valid reference.';
      return;
    }

    run(reference);
  });

  document.addEventListener('study:view-verse', (event) => {
    const reference = event.detail?.reference?.trim();
    if (!reference) return;
    refInput.value = reference;
    run(reference);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const defaultRef = refInput.value.trim();
  if (defaultRef) run(defaultRef);
}

function initGematriaTool() {
  const form = document.getElementById('gematria-form');
  const input = document.getElementById('gematria-input');
  const total = document.getElementById('gematria-total');
  const breakdown = document.getElementById('gematria-breakdown');

  if (!form || !input || !total || !breakdown) return;

  const calculate = () => {
    const text = input.value;
    const gematria = calculateGematria(text);

    total.textContent = `Total: ${gematria}`;
    const rows = breakdownByLetter(text);
    breakdown.innerHTML = rows.length
      ? rows.map((row) => `<li><strong>${row.letter}</strong> = ${row.value}</li>`).join('')
      : '<li>No Hebrew letters detected.</li>';

    highlightSefirot(mapGematriaToSefirot(gematria), { animateFlow: true });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  calculate();
}

function initDivineNameTool() {
  const form = document.getElementById('divine-name-form');
  const input = document.getElementById('divine-name-input');
  const output = document.getElementById('divine-name-output');
  const perms = document.getElementById('divine-name-permutations');

  if (!form || !input || !output || !perms) return;

  const runAnalysis = () => {
    const analysis = analyzeDivineName(input.value);
    output.textContent = `Gematria: ${analysis.gematria} · Sefirah: ${analysis.sefirah}`;
    perms.innerHTML =
      analysis.permutations.slice(0, 24).map((item) => `<li>${item}</li>`).join('') || '<li>No permutations.</li>';
    highlightSefirot(mapDivineNameToSefirot(input.value), { animateFlow: true });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runAnalysis();
  });

  runAnalysis();
}

function initResonanceTool() {
  const form = document.getElementById('resonance-form');
  const input = document.getElementById('resonance-input');
  const summary = document.getElementById('resonance-summary');
  const results = document.getElementById('resonance-results');

  if (!form || !input || !summary || !results) return;

  async function run() {
    const phrase = input.value.trim();
    if (!phrase) {
      summary.textContent = 'Gematria: —';
      results.innerHTML = '<li>Enter a Hebrew phrase.</li>';
      return;
    }

    const gematria = calculatePhraseGematria(phrase);
    summary.textContent = `Gematria: ${gematria}`;
    results.innerHTML = '<li>Searching Sefaria references…</li>';

    try {
      const resonances = await findResonantVerses(gematria);
      if (!resonances.length) {
        results.innerHTML = '<li>No exact gematria resonance found in the current candidate set.</li>';
      } else {
        results.innerHTML = resonances
          .map(
            (entry) =>
              `<li><strong>${entry.verse}</strong> · ${entry.gematria}<br />${entry.hebrew}<br /><em>${entry.english}</em></li>`,
          )
          .join('');
      }
      highlightSefirot(mapGematriaToSefirot(gematria), { animateFlow: true });
    } catch (error) {
      results.innerHTML = `<li>Unable to perform resonance search: ${error.message}</li>`;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  run();
}

function initPsalmAnalyzerTool() {
  const form = document.getElementById('psalm-analyzer-form');
  const input = document.getElementById('psalm-reference-input');
  const results = document.getElementById('psalm-analyzer-results');

  if (!form || !input || !results) return;

  async function run() {
    results.innerHTML = '<li>Analyzing Psalm structure…</li>';

    try {
      const rows = await analyzePsalm(input.value.trim());
      if (!rows.length) {
        results.innerHTML = '<li>No verses found for the selected Psalm.</li>';
        return;
      }

      results.innerHTML = rows
        .map(
          (row) =>
            `<li>Verse ${row.verseNumber} · Gematria ${row.gematria} · Names: ${
              row.divineNamesDetected.length ? row.divineNamesDetected.join(', ') : 'none'
            } · Suggested sefirah: ${row.suggestedSefirah}</li>`,
        )
        .join('');

      const divineHighlights = mapDivineNamesToSefirot(rows.flatMap((row) => row.divineNamesDetected));
      const gematriaHighlights = mapGematriaToSefirot(rows[0].gematria);
      highlightSefirot([...new Set([...divineHighlights, ...gematriaHighlights])], { animateFlow: true });
    } catch (error) {
      results.innerHTML = `<li>Unable to analyze Psalm: ${error.message}</li>`;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  run();
}

function init72NamesTool() {
  const form = document.getElementById('names72-form');
  const results = document.getElementById('names72-results');

  if (!form || !results) return;

  async function run() {
    results.innerHTML = '<li>Generating from Exodus 14:19-21…</li>';

    try {
      const names = await generate72Names();
      results.innerHTML = names
        .map((entry) => `<li>${entry.name} · ${entry.gematria} · ${entry.sefirotAssociation}</li>`)
        .join('');

      if (names[0]?.sefirotAssociation) {
        highlightSefirot([names[0].sefirotAssociation], { animateFlow: true });
      }
    } catch (error) {
      results.innerHTML = `<li>Unable to generate the 72 names: ${error.message}</li>`;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  run();
}

function init231GatesTool() {
  const form = document.getElementById('gates-form');
  const summary = document.getElementById('gates-summary');
  const results = document.getElementById('gates-results');

  if (!form || !summary || !results) return;

  function run() {
    const gates = generate231Gates();
    summary.textContent = `Total gates: ${gates.length}`;
    results.textContent = gates.join(' · ');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  run();
}

async function initStudyPage() {
  await Promise.all([
    injectComponent('#verse-viewer-slot', './components/verse-viewer.html'),
    injectComponent('#gematria-tool-slot', './components/gematria-tool.html'),
    injectComponent('#tree-of-life-slot', './components/tree-of-life.html'),
  ]);

  renderTreeNodes();
  initVerseMysticalPipeline();
  initGematriaTool();
  initResonanceTool();
  initPsalmAnalyzerTool();
  initDivineNameTool();
  init72NamesTool();
  init231GatesTool();


  document.addEventListener('verse:loaded', (event) => {
    highlightSefirot(event.detail?.sefirahHints || [], { animateFlow: true });
  });
}

initStudyPage().catch((error) => {
  const status = document.getElementById('study-page-status');
  if (status) status.textContent = `Unable to initialize study dashboard: ${error.message}`;
});
