import { getLinks, getText } from '../sefaria-api.js';
import { messiahTerms } from '../data/messiahTerms.js';

const WORD_REFERENCES = {
  משיח: ['Leviticus 4:3', 'Psalms 2:2', 'Daniel 9:25'],
  'בן דוד': ['2 Samuel 7:12', 'Jeremiah 23:5'],
  שילה: ['Genesis 49:10'],
  צמח: ['Jeremiah 23:5', 'Zechariah 3:8'],
  עמנואל: ['Isaiah 7:14', 'Isaiah 8:8'],
  ישועה: ['Isaiah 12:2', 'Psalms 3:8'],
  מושיע: ['Judges 3:9', 'Isaiah 43:11'],
  גואל: ['Isaiah 41:14', 'Ruth 4:14'],
  ינון: ['Psalms 72:17'],
  מנחם: ['Lamentations 1:16', 'Nahum 1:7'],
};

function dispatchEventHint(word) {
  document.dispatchEvent(
    new CustomEvent('sacred:sefirahHint', {
      detail: { word },
    }),
  );
}

function matchTerm(query) {
  if (!query) return messiahTerms[0];
  const normalized = query.trim().toLowerCase();
  return (
    messiahTerms.find((entry) => entry.word.includes(query) || entry.transliteration.toLowerCase().includes(normalized)) ||
    null
  );
}

function renderWordData(target, term) {
  if (!target || !term) return;

  target.innerHTML = `
    <article class="messiah-word" aria-live="polite">
      <h3>${term.word} · ${term.transliteration}</h3>
      <dl>
        <div><dt>Meaning</dt><dd>${term.meaning}</dd></div>
        <div><dt>Gematria</dt><dd class="messiah-gematria">${term.gematria}</dd></div>
        <div><dt>Root</dt><dd class="messiah-root">${term.root}</dd></div>
        <div><dt>Notes</dt><dd>${term.notes}</dd></div>
      </dl>
    </article>
  `;
}

function pickHebrewText(payload) {
  if (Array.isArray(payload?.versions)) {
    const hebrewVersion = payload.versions.find((version) => version.language === 'he');
    const text = hebrewVersion?.text;
    if (Array.isArray(text)) {
      return text.flat().filter(Boolean).join(' ');
    }
    if (typeof text === 'string') return text;
  }

  if (Array.isArray(payload?.he)) {
    return payload.he.flat().filter(Boolean).join(' ');
  }

  if (typeof payload?.he === 'string') return payload.he;
  return '';
}

function pickEnglishText(payload) {
  if (Array.isArray(payload?.versions)) {
    const englishVersion = payload.versions.find((version) => version.language === 'en');
    const text = englishVersion?.text;
    if (Array.isArray(text)) {
      return text.flat().filter(Boolean).join(' ');
    }
    if (typeof text === 'string') return text;
  }

  if (Array.isArray(payload?.text)) {
    return payload.text.flat().filter(Boolean).join(' ');
  }

  if (typeof payload?.text === 'string') return payload.text;
  return '';
}

async function renderVerses(verseTarget, term) {
  if (!verseTarget || !term) return;

  const references = WORD_REFERENCES[term.word] || [];
  if (!references.length) {
    verseTarget.innerHTML = '<li>No verse mapping configured for this term yet.</li>';
    return;
  }

  verseTarget.innerHTML = '<li>Loading verse data…</li>';

  try {
    const rows = await Promise.all(
      references.map(async (reference) => {
        const [textPayload, linksPayload] = await Promise.all([getText(reference), getLinks(reference)]);
        return {
          reference,
          hebrew: pickHebrewText(textPayload),
          english: pickEnglishText(textPayload),
          linksCount: Array.isArray(linksPayload) ? linksPayload.length : 0,
        };
      }),
    );

    verseTarget.innerHTML = rows
      .map(
        (row) => `
          <li>
            <strong>${row.reference}</strong><br />
            <span class="hebrew-text">${row.hebrew || 'Hebrew text unavailable.'}</span><br />
            <span>${row.english || 'English text unavailable.'}</span><br />
            <span>Commentary links: ${row.linksCount}</span>
          </li>
        `,
      )
      .join('');
  } catch (error) {
    verseTarget.innerHTML = `<li>Unable to load verses: ${error.message}</li>`;
  }
}

export function initMessiahExplorer() {
  const section = document.getElementById('messiah-explorer');
  const form = document.getElementById('messiah-search-form');
  const input = document.getElementById('messiah-search-input');
  const result = document.getElementById('messiah-word-result');
  const verses = document.getElementById('messiah-verses');

  if (!section || !form || !input || !result || !verses) return;

  async function runLookup() {
    const term = matchTerm(input.value);
    if (!term) {
      result.innerHTML = '<p>No matching messianic term found.</p>';
      verses.innerHTML = '<li>Try another Hebrew word or transliteration.</li>';
      return;
    }

    renderWordData(result, term);
    dispatchEventHint(term.word);
    await renderVerses(verses, term);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runLookup();
  });

  input.addEventListener('input', () => {
    const term = matchTerm(input.value);
    if (!term) return;
    renderWordData(result, term);
  });

  runLookup();
}
