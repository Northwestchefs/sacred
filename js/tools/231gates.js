import { HEBREW_LETTERS, gematria, mapValueToSefirah } from './hebrew-utils.js';

function generate231Gates() {
  const pairs = [];
  for (let i = 0; i < HEBREW_LETTERS.length; i += 1) {
    for (let j = i + 1; j < HEBREW_LETTERS.length; j += 1) {
      const pair = `${HEBREW_LETTERS[i]}${HEBREW_LETTERS[j]}`;
      const value = gematria(pair);
      pairs.push({
        pair,
        value,
        sefirah: mapValueToSefirah(value),
      });
    }
  }
  return pairs;
}

function init231GatesGenerator({ onSefirahChange } = {}) {
  const button = document.getElementById('generate-231gates-button');
  const output = document.getElementById('gates231-output');
  if (!button || !output) return;

  button.addEventListener('click', () => {
    const pairs = generate231Gates();
    output.innerHTML = `
      <p>Generated ${pairs.length} gates from ${HEBREW_LETTERS.length} Hebrew letters.</p>
      <div class="triplet-grid">
        ${pairs
          .map(
            (item) => `
              <article class="triplet-card">
                <p dir="rtl" lang="he"><strong>${item.pair}</strong></p>
                <p>${item.value} · ${item.sefirah}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    `;

    if (pairs[0] && onSefirahChange) {
      onSefirahChange(pairs[0].sefirah);
    }
  });
}

export { generate231Gates, init231GatesGenerator };
