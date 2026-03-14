import { gematria, mapValueToSefirah, stripHebrewMarks } from './hebrew-utils.js';

const EXODUS_REFS = ['Exodus 14:19', 'Exodus 14:20', 'Exodus 14:21'];

async function fetchHebrewVerse(ref) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&context=0&commentary=0&pad=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sefaria request failed (${response.status})`);
  const data = await response.json();
  return stripHebrewMarks(Array.isArray(data.he) ? data.he.join('') : data.he || '').replace(/[^\u05D0-\u05EA]/g, '');
}

async function generate72Triplets() {
  const [v19, v20, v21] = await Promise.all(EXODUS_REFS.map((ref) => fetchHebrewVerse(ref)));
  const sourceA = v19.slice(0, 72);
  const sourceB = v20.slice(0, 72).split('').reverse().join('');
  const sourceC = v21.slice(0, 72);

  return Array.from({ length: 72 }, (_, index) => {
    const triplet = `${sourceA[index] || ''}${sourceB[index] || ''}${sourceC[index] || ''}`;
    const value = gematria(triplet);
    return {
      position: index + 1,
      triplet,
      gematria: value,
      sefirah: mapValueToSefirah(value),
    };
  });
}

function init72NamesExplorer({ onSefirahChange } = {}) {
  const button = document.getElementById('generate-72names-button');
  const output = document.getElementById('names72-output');
  if (!button || !output) return;

  button.addEventListener('click', async () => {
    output.textContent = 'Generating 72 Names…';
    try {
      const triplets = await generate72Triplets();
      output.innerHTML = `
        <p>Generated ${triplets.length} triplets from Exodus 14:19–21.</p>
        <div class="triplet-grid">
          ${triplets
            .map(
              (item) => `
                <article class="triplet-card">
                  <p>#${item.position}</p>
                  <p dir="rtl" lang="he"><strong>${item.triplet}</strong></p>
                  <p>${item.gematria} · ${item.sefirah}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      `;

      if (triplets[0] && onSefirahChange) {
        onSefirahChange(triplets[0].sefirah);
      }
    } catch (error) {
      output.textContent = error.message;
    }
  });
}

export { generate72Triplets, init72NamesExplorer };
