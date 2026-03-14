import { breakdownByLetter, calculateGematria } from './gematria.js';
import { analyzeDivineName } from './divine-names.js';
import { createSefirotState, mapDivineNameToSefirot, SEFIROT } from './sefirot-map.js';
import { initTorahViewer } from './torah-viewer.js';

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
      <g data-sefirah="${name}">
        <circle cx="${x}" cy="${y}" r="18" fill="#f7f6f2" stroke="#2c4a6f" />
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8">${name}</text>
      </g>
    `;
  }).join('');
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

function initGematriaTool() {
  const form = document.getElementById('gematria-form');
  const input = document.getElementById('gematria-input');
  const total = document.getElementById('gematria-total');
  const breakdown = document.getElementById('gematria-breakdown');

  if (!form || !input || !total || !breakdown) return;

  const calculate = () => {
    const text = input.value;
    total.textContent = `Total: ${calculateGematria(text)}`;
    const rows = breakdownByLetter(text);
    breakdown.innerHTML = rows.length
      ? rows.map((row) => `<li><strong>${row.letter}</strong> = ${row.value}</li>`).join('')
      : '<li>No Hebrew letters detected.</li>';
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
    perms.innerHTML = analysis.permutations.slice(0, 24).map((item) => `<li>${item}</li>`).join('') || '<li>No permutations.</li>';
    highlightSefirot(mapDivineNameToSefirot(input.value));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runAnalysis();
  });

  runAnalysis();
}

async function initStudyPage() {
  await Promise.all([
    injectComponent('#verse-viewer-slot', './components/verse-viewer.html'),
    injectComponent('#gematria-tool-slot', './components/gematria-tool.html'),
    injectComponent('#tree-of-life-slot', './components/tree-of-life.html'),
  ]);

  renderTreeNodes();
  initTorahViewer(document);
  initGematriaTool();
  initDivineNameTool();

  document.addEventListener('verse:loaded', (event) => {
    highlightSefirot(event.detail?.sefirahHints || []);
  });
}

initStudyPage().catch((error) => {
  const status = document.getElementById('study-page-status');
  if (status) status.textContent = `Unable to initialize study dashboard: ${error.message}`;
});
