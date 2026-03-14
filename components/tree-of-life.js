const FLOW_COLOR = '#5f8dd3';
const INACTIVE_COLOR = '#9aa7b6';

export function highlightSefirot(sefirah = [], options = {}) {
  const active = Array.isArray(sefirah) ? sefirah : [sefirah];
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

  document.querySelectorAll('.tree-lines path').forEach((path) => {
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
