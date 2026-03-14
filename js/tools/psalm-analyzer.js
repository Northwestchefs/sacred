import { DIVINE_NAMES, gematria, mapValueToSefirah, normalizeHebrewText } from './hebrew-utils.js';

const VERSE_DATA_PATH = './reference/hebrew-bible/processed/verses.json';
let verseCache = null;

async function loadVerses() {
  if (verseCache) return verseCache;
  const response = await fetch(VERSE_DATA_PATH);
  if (!response.ok) throw new Error(`Unable to load verse dataset (${response.status})`);
  verseCache = await response.json();
  return verseCache;
}

function detectDivineNames(text) {
  const cleanText = normalizeHebrewText(text);
  return DIVINE_NAMES.filter((name) => cleanText.includes(name));
}

function analyzePsalmStructure(verses) {
  return {
    verseCount: verses.length,
    averageVerseLength: verses.length
      ? Math.round(verses.reduce((sum, verse) => sum + normalizeHebrewText(verse.text || '').length, 0) / verses.length)
      : 0,
    acrosticHint: verses.some((verse, index) => {
      const first = normalizeHebrewText(verse.text || '').trim().charAt(0);
      return index > 0 && first && first !== normalizeHebrewText(verses[index - 1].text || '').trim().charAt(0);
    }),
  };
}

async function analyzePsalm(psalmNumber) {
  const verses = (await loadVerses())
    .filter((verse) => (verse.bookEnglish || '').toLowerCase() === 'psalms' && Number(verse.chapter) === Number(psalmNumber))
    .map((verse) => {
      const value = gematria(verse.text || '');
      return {
        ref: `Psalms ${verse.chapter}:${verse.verse}`,
        text: verse.text || '',
        gematria: value,
        divineNames: detectDivineNames(verse.text || ''),
        sefirah: mapValueToSefirah(value),
      };
    });

  return {
    psalmNumber: Number(psalmNumber),
    structure: analyzePsalmStructure(verses),
    verses,
  };
}

function initPsalmAnalyzer({ onSefirahChange } = {}) {
  const input = document.getElementById('psalm-number-input');
  const button = document.getElementById('psalm-analyze-button');
  const output = document.getElementById('psalm-analysis-output');
  if (!input || !button || !output) return;

  button.addEventListener('click', async () => {
    const psalmNumber = Number(input.value);
    if (!psalmNumber) return;

    try {
      const result = await analyzePsalm(psalmNumber);
      const verseMarkup = result.verses
        .map(
          (verse) => `
            <li>
              <p><strong>${verse.ref}</strong> · Gematria: ${verse.gematria} · Sefirah: ${verse.sefirah}</p>
              <p dir="rtl" lang="he">${verse.text}</p>
              <p>Divine names: ${verse.divineNames.length ? verse.divineNames.join(', ') : 'none detected'}</p>
            </li>
          `,
        )
        .join('');

      output.innerHTML = `
        <p>Psalm ${result.psalmNumber} has ${result.structure.verseCount} verses (avg length ${result.structure.averageVerseLength} letters).</p>
        <p>Acrostic pattern hint: ${result.structure.acrosticHint ? 'possible variation detected' : 'no clear signal'}</p>
        <ol>${verseMarkup}</ol>
      `;

      if (result.verses[0] && onSefirahChange) {
        onSefirahChange(result.verses[0].sefirah);
      }
    } catch (error) {
      output.textContent = error.message;
    }
  });
}

export { analyzePsalm, detectDivineNames, initPsalmAnalyzer };
