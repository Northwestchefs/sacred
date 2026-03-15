import { SEFIROT, createSefirotState, mapPatternResultsToSefirot } from '../sefirot-map.js';
import { buildGematriaDataset } from '../tools/tanakh-gematria-map.js';
import { scanBookForDivineNames } from '../tools/divine-name-distribution.js';
import { SACRED_NUMBERS, findVersesByNumber } from '../tools/sacred-numbers.js';
import { renderGematriaHeatmap } from '../visualization/gematria-heatmap.js';

const TANAKH_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
  'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah',
  '1 Chronicles', '2 Chronicles',
];

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

function populateBookSelect(select) {
  if (!select) return;
  select.innerHTML = TANAKH_BOOKS.map((book) => `<option value="${book}">${book}</option>`).join('');
}

function renderTreeNodes() {
  const group = document.getElementById('tree-sefirot-nodes');
  if (!group) return;

  group.innerHTML = SEFIROT.map((name) => {
    const [x, y] = NODE_COORDINATES[name];
    return `
      <g data-sefirah="${name}">
        <circle cx="${x}" cy="${y}" r="18" fill="#f7f6f2" stroke="#2c4a6f" />
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8">${name}</text>
      </g>
    `;
  }).join('');

  group.querySelectorAll('g[data-sefirah]').forEach((node) => {
    node.addEventListener('click', () => {
      const sefirahName = node.dataset.sefirah;
      if (!sefirahName) return;

      highlightSefirot([sefirahName]);
      if (typeof window.trackEvent === 'function') {
        window.trackEvent('sefirah_click', {
          sefirah: sefirahName,
        });
      }
    });
  });
}

function highlightSefirot(active = []) {
  const state = createSefirotState();
  active.forEach((name) => {
    if (name in state) state[name] = true;
  });

  document.querySelectorAll('#tree-sefirot-nodes g[data-sefirah]').forEach((node) => {
    const isActive = state[node.dataset.sefirah];
    const circle = node.querySelector('circle');
    if (!circle) return;
    circle.setAttribute('fill', isActive ? '#d8e8ff' : '#f7f6f2');
    circle.setAttribute('stroke-width', isActive ? '3' : '1.5');
  });

  const activeLabel = document.getElementById('tree-active-sefirot');
  if (activeLabel) {
    activeLabel.textContent = `Active sefirot: ${active.length ? active.join(', ') : 'none'}`;
  }
}

function initGematriaHeatmap() {
  const form = document.getElementById('heatmap-form');
  const select = document.getElementById('heatmap-book-select');
  const canvas = document.getElementById('gematria-heatmap-canvas');
  const statusNode = document.getElementById('gematria-heatmap-status');

  if (!form || !select || !canvas) return;

  populateBookSelect(select);
  select.value = 'Genesis';

  async function run() {
    const book = select.value;
    const dataset = await buildGematriaDataset(book);
    renderGematriaHeatmap({ canvas, dataset, statusNode, book });
    highlightSefirot(mapPatternResultsToSefirot({ gematria: dataset[0]?.gematria || 0 }));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await run();
    } catch (error) {
      if (statusNode) statusNode.textContent = `Unable to build heatmap: ${error.message}`;
    }
  });

  run().catch((error) => {
    if (statusNode) statusNode.textContent = `Unable to build heatmap: ${error.message}`;
  });
}

function initDivineNameDistribution() {
  const form = document.getElementById('divine-distribution-form');
  const bookSelect = document.getElementById('divine-distribution-book');
  const searchInput = document.getElementById('divine-distribution-search');
  const results = document.getElementById('divine-distribution-results');

  if (!form || !bookSelect || !searchInput || !results) return;

  populateBookSelect(bookSelect);
  bookSelect.value = 'Psalms';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const matches = await scanBookForDivineNames(bookSelect.value);
      const term = searchInput.value.trim();
      const filtered = term ? matches.filter((entry) => entry.name.includes(term)) : matches;

      results.innerHTML = filtered.length
        ? filtered.slice(0, 150).map((item) => `<li><strong>${item.verse}</strong> · ${item.name}</li>`).join('')
        : '<li>No divine name matches for this query.</li>';

      highlightSefirot(mapPatternResultsToSefirot({ divineNames: filtered.map((item) => item.name) }));
    } catch (error) {
      results.innerHTML = `<li>Unable to scan divine names: ${error.message}</li>`;
    }
  });
}

function initSacredNumbers() {
  const form = document.getElementById('sacred-numbers-form');
  const bookSelect = document.getElementById('sacred-numbers-book');
  const searchInput = document.getElementById('sacred-numbers-search');
  const results = document.getElementById('sacred-numbers-results');

  if (!form || !bookSelect || !searchInput || !results) return;

  populateBookSelect(bookSelect);
  bookSelect.value = 'Genesis';
  searchInput.value = String(SACRED_NUMBERS[0]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const requestedNumber = Number(searchInput.value.trim());
    if (!SACRED_NUMBERS.includes(requestedNumber)) {
      results.innerHTML = `<li>Choose one of the sacred numbers: ${SACRED_NUMBERS.join(', ')}.</li>`;
      return;
    }

    try {
      const matches = await findVersesByNumber(requestedNumber, bookSelect.value);
      results.innerHTML = matches.length
        ? matches.slice(0, 120).map((item) => `<li><strong>${item.verse}</strong> · gematria ${item.gematria}</li>`).join('')
        : '<li>No verses matched this sacred number in the selected book.</li>';

      highlightSefirot(mapPatternResultsToSefirot({ sacredNumber: requestedNumber }));
    } catch (error) {
      results.innerHTML = `<li>Unable to search sacred numbers: ${error.message}</li>`;
    }
  });
}

async function initPatternExplorer() {
  await Promise.all([
    injectComponent('#gematria-heatmap-slot', '../components/gematria-heatmap.html'),
    injectComponent('#tree-of-life-slot', '../components/tree-of-life.html'),
  ]);

  renderTreeNodes();
  highlightSefirot(['Tiferet']);
  initGematriaHeatmap();
  initDivineNameDistribution();
  initSacredNumbers();
}

document.addEventListener('DOMContentLoaded', () => {
  initPatternExplorer().catch((error) => {
    console.error('Pattern explorer failed to initialize.', error);
  });
});
