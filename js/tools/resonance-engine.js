import { gematria, stripHebrewMarks, mapValueToSefirah } from './hebrew-utils.js';

const VERSE_DATA_PATH = './reference/hebrew-bible/processed/verses.json';
let verseCache = null;

function buildRef(verse) {
  return `${verse.bookEnglish || verse.book || verse.bookSlug} ${verse.chapter}:${verse.verse}`;
}

async function loadVerses() {
  if (verseCache) return verseCache;
  const response = await fetch(VERSE_DATA_PATH);
  if (!response.ok) {
    throw new Error(`Unable to load verse dataset (${response.status})`);
  }
  verseCache = await response.json();
  return verseCache;
}

async function fetchVerseHebrew(ref) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&context=0&commentary=0&pad=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sefaria request failed (${response.status})`);
  const data = await response.json();
  if (typeof data.he === 'string') return data.he;
  if (Array.isArray(data.he)) return data.he.join(' ');
  return '';
}

async function calculateVerseGematria(ref) {
  const hebrewText = await fetchVerseHebrew(ref);
  return {
    ref,
    text: stripHebrewMarks(hebrewText),
    value: gematria(hebrewText),
    sefirah: mapValueToSefirah(gematria(hebrewText)),
  };
}

async function findMatchingGematria(value) {
  const verses = await loadVerses();
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return [];

  return verses
    .map((verse) => {
      const verseValue = gematria(verse.text || '');
      return {
        ref: buildRef(verse),
        text: stripHebrewMarks(verse.text || ''),
        value: verseValue,
        sefirah: mapValueToSefirah(verseValue),
        sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(buildRef(verse).replace(/\s+/g, '_'))}`,
      };
    })
    .filter((item) => item.value === numericValue)
    .slice(0, 50);
}

function renderGematriaMatches(container, matches) {
  if (!container) return;
  if (!matches.length) {
    container.innerHTML = '<p>No matching verses were found in the indexed text.</p>';
    return;
  }

  container.innerHTML = matches
    .map(
      (match) => `
        <article class="card">
          <h4>${match.ref}</h4>
          <p dir="rtl" lang="he">${match.text || '—'}</p>
          <p>Gematria: <strong>${match.value}</strong> · Sefirah: <strong>${match.sefirah}</strong></p>
          <a href="${match.sefariaUrl}" target="_blank" rel="noreferrer">Open on Sefaria</a>
        </article>
      `,
    )
    .join('');
}

function initResonanceEngine({ onSefirahChange } = {}) {
  const input = document.getElementById('gematria-hebrew-input');
  const valueOutput = document.getElementById('gematria-value-output');
  const matchesContainer = document.getElementById('gematria-match-results');
  const refInput = document.getElementById('gematria-ref-input');
  const refButton = document.getElementById('gematria-ref-calc');

  if (!input || !valueOutput || !matchesContainer) return;

  async function updateFromText() {
    const value = gematria(input.value);
    valueOutput.textContent = String(value);
    const matches = await findMatchingGematria(value);
    renderGematriaMatches(matchesContainer, matches);
    if (onSefirahChange) onSefirahChange(mapValueToSefirah(value));
  }

  input.addEventListener('input', () => {
    updateFromText().catch((error) => {
      valueOutput.textContent = 'Error';
      matchesContainer.innerHTML = `<p>${error.message}</p>`;
    });
  });

  if (refInput && refButton) {
    refButton.addEventListener('click', async () => {
      const ref = refInput.value.trim();
      if (!ref) return;
      try {
        const result = await calculateVerseGematria(ref);
        valueOutput.textContent = `${result.value} (${result.ref})`;
        if (onSefirahChange) onSefirahChange(result.sefirah);
      } catch (error) {
        valueOutput.textContent = error.message;
      }
    });
  }

  updateFromText().catch(() => {});
}

export { calculateVerseGematria, findMatchingGematria, initResonanceEngine };
