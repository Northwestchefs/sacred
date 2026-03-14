const FLOW_COLOR = '#5f8dd3';
const INACTIVE_COLOR = '#9aa7b6';

function normalizeToArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function highlightSefirot(sefirah = [], options = {}) {
  const active = normalizeToArray(sefirah);
  const activeSet = new Set(active.filter(Boolean));
  const shouldAnimate = options.animateFlow !== false;

  document.querySelectorAll('#tree-sefirot-nodes g[data-sefirah]').forEach((node) => {
    const circle = node.querySelector('circle');
    if (!circle) return;

    const isActive = activeSet.has(node.dataset.sefirah);
    node.dataset.state = isActive ? 'highlighted' : 'inactive';
    circle.setAttribute('fill', isActive ? '#d8e8ff' : '#f7f6f2');
    circle.setAttribute('stroke-width', isActive ? '3' : '1.5');
  });

  document.querySelectorAll('#tree-paths line[data-path-id]').forEach((path) => {
    if (shouldAnimate && activeSet.size) {
      path.dataset.state = 'flowing';
      path.setAttribute('stroke', FLOW_COLOR);
      path.setAttribute('stroke-dasharray', '8 5');
      path.style.animation = 'treeFlow 1.4s linear infinite';
    } else {
      path.dataset.state = 'inactive';
      path.setAttribute('stroke', INACTIVE_COLOR);
      path.removeAttribute('stroke-dasharray');
      path.style.animation = '';
    }
  });

  const activeLabel = document.getElementById('tree-active-sefirot');
  if (activeLabel) {
    activeLabel.textContent = `Active sefirot: ${active.length ? active.join(', ') : 'none'}`;
  }
}

export function highlightPathsByLetters(letters = []) {
  const activeLetters = new Set(normalizeToArray(letters).filter(Boolean));
  const activePathRows = [];

  document.querySelectorAll('#tree-paths line[data-letter]').forEach((line) => {
    const isMatch = activeLetters.has(line.dataset.letter);
    line.dataset.highlight = isMatch ? 'word-match' : 'none';
    if (isMatch) {
      activePathRows.push(`${line.dataset.letter} (${line.dataset.from}→${line.dataset.to})`);
    }
  });

  const activePathsLabel = document.getElementById('tree-active-paths');
  if (activePathsLabel) {
    activePathsLabel.textContent = `Active paths: ${activePathRows.length ? activePathRows.join(', ') : 'none'}`;
  }
}

export function getHebrewLettersFromText(text = '') {
  return [...new Set((text.match(/[\u0590-\u05FF]/g) || []).filter(Boolean))];
}
