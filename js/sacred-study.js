import { breakdownByLetter, calculateOrdinalGematria, calculateStandardGematria, GEMATRIA_SYSTEMS } from './gematria.js';
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
import { getHebrewLettersFromText, highlightPathsByLetters, highlightSefirot } from '../components/tree-of-life.js';

const NODE_COORDINATES = {
  Keter: [150, 40],
  Chokhmah: [95, 95],
  Binah: [205, 95],
  Chesed: [75, 180],
  Gevurah: [225, 180],
  Tiferet: [150, 200],
  Netzach: [95, 290],
  Hod: [205, 290],
  Yesod: [150, 345],
  Malkhut: [150, 395],
};

const TREE_PATHS = [
  { id: 1, letter: 'א', gematria: 1, from: 'Keter', to: 'Chokhmah' },
  { id: 2, letter: 'ב', gematria: 2, from: 'Keter', to: 'Binah' },
  { id: 3, letter: 'ג', gematria: 3, from: 'Keter', to: 'Tiferet' },
  { id: 4, letter: 'ד', gematria: 4, from: 'Keter', to: 'Chesed' },
  { id: 5, letter: 'ה', gematria: 5, from: 'Keter', to: 'Gevurah' },
  { id: 6, letter: 'ו', gematria: 6, from: 'Chokhmah', to: 'Binah' },
  { id: 7, letter: 'ז', gematria: 7, from: 'Chokhmah', to: 'Tiferet' },
  { id: 8, letter: 'ח', gematria: 8, from: 'Binah', to: 'Tiferet' },
  { id: 9, letter: 'ט', gematria: 9, from: 'Chokhmah', to: 'Chesed' },
  { id: 10, letter: 'י', gematria: 10, from: 'Binah', to: 'Gevurah' },
  { id: 11, letter: 'כ', gematria: 20, from: 'Chesed', to: 'Gevurah' },
  { id: 12, letter: 'ל', gematria: 30, from: 'Chesed', to: 'Tiferet' },
  { id: 13, letter: 'מ', gematria: 40, from: 'Gevurah', to: 'Tiferet' },
  { id: 14, letter: 'נ', gematria: 50, from: 'Chesed', to: 'Netzach' },
  { id: 15, letter: 'ס', gematria: 60, from: 'Gevurah', to: 'Hod' },
  { id: 16, letter: 'ע', gematria: 70, from: 'Tiferet', to: 'Netzach' },
  { id: 17, letter: 'פ', gematria: 80, from: 'Tiferet', to: 'Hod' },
  { id: 18, letter: 'צ', gematria: 90, from: 'Tiferet', to: 'Yesod' },
  { id: 19, letter: 'ק', gematria: 100, from: 'Netzach', to: 'Hod' },
  { id: 20, letter: 'ר', gematria: 200, from: 'Netzach', to: 'Yesod' },
  { id: 21, letter: 'ש', gematria: 300, from: 'Hod', to: 'Yesod' },
  { id: 22, letter: 'ת', gematria: 400, from: 'Yesod', to: 'Malkhut' },
];

async function injectComponent(targetSelector, path) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load component: ${path}`);
  target.innerHTML = await response.text();
}

function renderTreeNodes() {
  const nodeGroup = document.getElementById('tree-sefirot-nodes');
  const pathGroup = document.getElementById('tree-paths');
  const labelGroup = document.getElementById('tree-path-labels');
  const tooltip = document.getElementById('tree-path-tooltip');
  if (!nodeGroup || !pathGroup || !labelGroup) return;

  pathGroup.innerHTML = TREE_PATHS.map((path) => {
    const [x1, y1] = NODE_COORDINATES[path.from];
    const [x2, y2] = NODE_COORDINATES[path.to];
    return `<line class="tree-path" data-path-id="${path.id}" data-letter="${path.letter}" data-gematria="${path.gematria}" data-from="${path.from}" data-to="${path.to}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');

  labelGroup.innerHTML = TREE_PATHS.map((path) => {
    const [x1, y1] = NODE_COORDINATES[path.from];
    const [x2, y2] = NODE_COORDINATES[path.to];
    const x = (x1 + x2) / 2;
    const y = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    return `<text class="tree-path-letter" x="${x}" y="${y}" transform="rotate(${angle} ${x} ${y})">${path.letter}</text>`;
  }).join('');

  nodeGroup.innerHTML = SEFIROT.map((name) => {
    const [x, y] = NODE_COORDINATES[name];
    return `
      <g data-sefirah="${name}" data-state="inactive">
        <circle cx="${x}" cy="${y}" r="16" fill="#f7f6f2" stroke="#2c4a6f" />
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="7.5">${name}</text>
      </g>
    `;
  }).join('');

  pathGroup.querySelectorAll('line[data-path-id]').forEach((line) => {
    line.addEventListener('mouseenter', () => {
      line.dataset.state = 'hover';
      if (!tooltip) return;
      tooltip.hidden = false;
      tooltip.textContent = `${line.dataset.letter} · Gematria ${line.dataset.gematria} · ${line.dataset.from} ↔ ${line.dataset.to}`;
    });

    line.addEventListener('mouseleave', () => {
      line.dataset.state = line.dataset.highlight === 'word-match' ? 'word-match' : 'inactive';
      if (!tooltip) return;
      tooltip.hidden = true;
      tooltip.textContent = '';
    });
  });
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

  const renderEnglishVerse = (target, content) => {
    if (!target) return;

    const html = String(content || '').trim();
    if (!html) {
      target.textContent = 'English translation unavailable.';
      return;
    }

    target.innerHTML = html;
  };

  const renderCommentary = (items = []) => {
    if (!commentaryList) return;
    commentaryList.innerHTML = items.length
      ? items
          .map(
            (item) => {
              const sourceRef = item.sourceRef || 'Unknown source';
              const url =
                item.url || `https://www.sefaria.org/${encodeURIComponent(String(sourceRef).replace(/\s+/g, '_'))}`;
              return `<li><strong>${item.commentator}</strong> · <a href="${url}" target="_blank" rel="noopener noreferrer">${sourceRef}</a><br /><em>${item.text || 'No excerpt available.'}</em></li>`;
            },
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
      renderEnglishVerse(english, result.verse.english);

      renderGematria(result.gematria);
      renderDivineNames(result.divineNames);
      renderCommentary(result.commentary);

      const sefirahList = [result.sefirot.primarySefirah, ...result.sefirot.secondarySefirot].filter(Boolean);
      highlightSefirot(sefirahList, { animateFlow: true });
      highlightPathsByLetters(getHebrewLettersFromText(result.verse.hebrew || ''));

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
  const system = document.getElementById('gematria-system');
  const total = document.getElementById('gematria-total');
  const expression = document.getElementById('gematria-expression');
  const breakdown = document.getElementById('gematria-breakdown');

  if (!form || !input || !system || !total || !expression || !breakdown) return;

  const calculators = {
    standard: calculateStandardGematria,
    ordinal: calculateOrdinalGematria,
  };

  const calculate = () => {
    const text = input.value;
    const selectedSystem = GEMATRIA_SYSTEMS[system.value] ? system.value : 'standard';
    const calculateWithSystem = calculators[selectedSystem] || calculateStandardGematria;
    const gematria = calculateWithSystem(text);

    total.textContent = `Total: ${gematria}`;

    const rows = breakdownByLetter(text, selectedSystem);
    expression.textContent = rows.length
      ? `${rows.map((row) => `${row.letter} (${row.value})`).join(' + ')}`
      : '—';

    breakdown.innerHTML = rows.length
      ? rows.map((row) => `<li><strong>${row.letter}</strong> = ${row.value}</li>`).join('')
      : '<li>No Hebrew letters detected.</li>';

    highlightSefirot(mapGematriaToSefirot(gematria), { animateFlow: true });
    highlightPathsByLetters(getHebrewLettersFromText(text));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  input.addEventListener('input', calculate);
  system.addEventListener('change', calculate);

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
    highlightPathsByLetters(getHebrewLettersFromText(input.value));
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
      highlightPathsByLetters(getHebrewLettersFromText(phrase));
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
      highlightPathsByLetters([]);
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
        highlightPathsByLetters(getHebrewLettersFromText(names[0].name));
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
  highlightPathsByLetters([]);
  initVerseMysticalPipeline();
  initGematriaTool();
  initResonanceTool();
  initPsalmAnalyzerTool();
  initDivineNameTool();
  init72NamesTool();
  init231GatesTool();

  document.addEventListener('sacred:sefirahHint', (event) => {
    const word = event.detail?.word || '';
    if (!word) return;
    const sefirahHints = mapGematriaToSefirot(calculateStandardGematria(word));
    highlightSefirot(sefirahHints, { animateFlow: true });
    highlightPathsByLetters(getHebrewLettersFromText(word));
  });

  document.addEventListener('verse:loaded', (event) => {
    highlightSefirot(event.detail?.sefirahHints || [], { animateFlow: true });
    highlightPathsByLetters(getHebrewLettersFromText(event.detail?.hebrew || ''));
  });
}

initStudyPage().catch((error) => {
  const status = document.getElementById('study-page-status');
  if (status) status.textContent = `Unable to initialize study dashboard: ${error.message}`;
});
