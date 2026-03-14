import { SEFIROT } from '../tools/hebrew-utils.js';
import { initResonanceEngine } from '../tools/resonance-engine.js';
import { initPsalmAnalyzer } from '../tools/psalm-analyzer.js';
import { init72NamesExplorer } from '../tools/72names.js';
import { init231GatesGenerator } from '../tools/231gates.js';

function renderTreeOfLife(activeSefirah) {
  const container = document.getElementById('tree-of-life');
  if (!container) return;

  container.innerHTML = SEFIROT.map(
    (name) => `<li class="tree-node${name === activeSefirah ? ' is-active' : ''}" data-sefirah="${name}">${name}</li>`,
  ).join('');
}

function setSefirahFocus(sefirah) {
  const active = sefirah || 'Tiferet';
  const label = document.getElementById('tree-active-sefirah');
  if (label) {
    label.textContent = active;
  }
  renderTreeOfLife(active);
}

function initMysticalDashboard() {
  setSefirahFocus('Tiferet');
  const options = { onSefirahChange: setSefirahFocus };
  initResonanceEngine(options);
  initPsalmAnalyzer(options);
  init72NamesExplorer(options);
  init231GatesGenerator(options);
}

document.addEventListener('DOMContentLoaded', initMysticalDashboard);
