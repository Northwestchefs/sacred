function getColor(value, maxValue) {
  if (!maxValue) return 'rgba(44,74,111,0.08)';
  const intensity = Math.max(0.08, value / maxValue);
  return `rgba(44, 74, 111, ${Math.min(0.95, intensity).toFixed(3)})`;
}

function drawHeatmap(canvas, dataset = []) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!dataset.length) {
    ctx.fillStyle = '#5a6774';
    ctx.font = '16px serif';
    ctx.fillText('No verses available for this selection.', 12, 30);
    return;
  }

  const columns = Math.max(12, Math.ceil(Math.sqrt(dataset.length)));
  const rows = Math.ceil(dataset.length / columns);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const maxGematria = Math.max(...dataset.map((entry) => entry.gematria));

  dataset.forEach((entry, index) => {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;

    ctx.fillStyle = getColor(entry.gematria, maxGematria);
    ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
  });
}

export function renderGematriaHeatmap({ canvas, dataset, statusNode, book }) {
  if (!canvas) return;
  drawHeatmap(canvas, dataset);

  if (statusNode) {
    const total = dataset?.length || 0;
    const maxGematria = total ? Math.max(...dataset.map((entry) => entry.gematria)) : 0;
    statusNode.textContent = `Loaded ${total} verses for ${book}. Darker tiles represent higher gematria values (max ${maxGematria}).`;
  }
}
