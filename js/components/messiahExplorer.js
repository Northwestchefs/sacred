import { getLinks, getText } from '../sefaria-api.js';
import { allTermCards, messiahWordStudy } from '../data/messiahTerms.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'titles', label: 'Titles' },
  { key: 'salvation', label: 'Salvation' },
  { key: 'prophecy', label: 'Prophecy' },
  { key: 'gematria', label: 'Gematria' },
];

const verseCache = new Map();

function dispatchEventHint(word) {
  document.dispatchEvent(
    new CustomEvent('sacred:sefirahHint', {
      detail: { word },
    }),
  );
}

function pickHebrewText(payload) {
  if (Array.isArray(payload?.versions)) {
    const hebrewVersion = payload.versions.find((version) => version.language === 'he');
    const text = hebrewVersion?.text;
    if (Array.isArray(text)) return text.flat().filter(Boolean).join(' ');
    if (typeof text === 'string') return text;
  }

  if (Array.isArray(payload?.he)) return payload.he.flat().filter(Boolean).join(' ');
  if (typeof payload?.he === 'string') return payload.he;
  return '';
}

async function getVerseData(reference) {
  if (!verseCache.has(reference)) {
    verseCache.set(
      reference,
      Promise.all([getText(reference), getLinks(reference)]).then(([textPayload, linksPayload]) => ({
        reference,
        hebrew: pickHebrewText(textPayload),
        linksCount: Array.isArray(linksPayload) ? linksPayload.length : 0,
      })),
    );
  }
  return verseCache.get(reference);
}

function renderFilters(container, onSelect, activeFilter) {
  container.innerHTML = FILTERS.map(
    (filter) => `<button class="button filter-button${filter.key === activeFilter ? ' active' : ''}" data-filter="${filter.key}" type="button">${filter.label}</button>`,
  ).join('');

  container.querySelectorAll('button[data-filter]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.filter));
  });
}

function renderSectionTitle(title, description) {
  return `
    <header class="messiah-section-header">
      <h3>${title}</h3>
      <p>${description}</p>
    </header>
  `;
}

function termCardMarkup(term) {
  const verseItems = term.verses
    .map(
      (reference) => `
      <li>
        <button type="button" class="verse-expand" data-reference="${reference}">${reference}</button>
        <div class="verse-panel" data-verse-panel="${reference}"></div>
      </li>`,
    )
    .join('');

  return `
    <article class="term-card" data-category="${term.category}">
      <h4 class="hebrew-term">${term.word}</h4>
      <p class="transliteration">${term.transliteration}</p>
      <dl>
        <div><dt>Gematria</dt><dd>${term.gematria}</dd></div>
        <div><dt>Root</dt><dd>${term.root}</dd></div>
        <div><dt>Meaning</dt><dd>${term.meaning}</dd></div>
      </dl>
      <details>
        <summary>Verse references & notes</summary>
        <p>${term.description}</p>
        <ul class="verse-list">${verseItems}</ul>
      </details>
    </article>
  `;
}

function prophecyMarkup(item) {
  const links = item.commentaryLinks.map((link) => `<li>${link}</li>`).join('');
  return `
    <article class="term-card prophecy-card" data-category="prophecy">
      <h4>${item.title}</h4>
      <details>
        <summary>Open Hebrew text & commentary links</summary>
        <button type="button" class="verse-expand" data-reference="${item.reference}">${item.reference}</button>
        <div class="verse-panel" data-verse-panel="${item.reference}"></div>
        <h5>Commentary pathways</h5>
        <ul>${links}</ul>
      </details>
    </article>
  `;
}

function wireVerseExpanders(scope) {
  scope.querySelectorAll('.verse-expand').forEach((button) => {
    button.addEventListener('click', async () => {
      const reference = button.dataset.reference;
      const panel = scope.querySelector(`[data-verse-panel="${reference}"]`);
      if (!panel) return;
      panel.innerHTML = '<p>Loading Hebrew text…</p>';
      try {
        const data = await getVerseData(reference);
        panel.innerHTML = `
          <p class="hebrew-text">${data.hebrew || 'Hebrew text unavailable.'}</p>
          <p class="commentary-count">Commentary links: ${data.linksCount}</p>
        `;
      } catch (error) {
        panel.innerHTML = `<p>Unable to load verse data: ${error.message}</p>`;
      }
    });
  });
}

function initMessiahExplorer() {
  const container = document.getElementById('messiah-explorer');
  if (!container) return;

  let activeFilter = 'all';

  const render = () => {
    const showTerms = activeFilter !== 'prophecy';
    const showProphecy = activeFilter === 'all' || activeFilter === 'prophecy';

    const coreCards =
      activeFilter === 'salvation'
        ? ''
        : messiahWordStudy.coreTitles
            .filter((term) => activeFilter !== 'gematria' || term.gematria >= 180)
            .map(termCardMarkup)
            .join('');

    const salvationCards =
      activeFilter === 'titles'
        ? ''
        : messiahWordStudy.salvationLanguage
            .filter((term) => activeFilter !== 'gematria' || term.gematria >= 180)
            .map(termCardMarkup)
            .join('');

    const prophecyCards = messiahWordStudy.messianicProphecies.map(prophecyMarkup).join('');

    container.innerHTML = `
      <section class="filter-row" id="messiah-filters" aria-label="Word study filters"></section>

      ${showTerms && coreCards ? `${renderSectionTitle('Core Messianic Titles', 'Key royal and symbolic names in messianic study.')}
      <section class="term-grid">${coreCards}</section>` : ''}

      ${showTerms && salvationCards ? `${renderSectionTitle('Salvation Language', 'Terms of rescue, redemption, atonement, and deliverance.')}
      <section class="term-grid">${salvationCards}</section>` : ''}

      ${showProphecy ? `${renderSectionTitle('Messianic Prophecies', 'Index of pivotal passages with expandable Hebrew text.')}
      <section class="term-grid">${prophecyCards}</section>` : ''}
    `;

    renderFilters(container.querySelector('#messiah-filters'), (filter) => {
      activeFilter = filter;
      render();
    }, activeFilter);

    wireVerseExpanders(container);

    const firstVisibleTerm = allTermCards.find((term) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'gematria') return term.gematria >= 180;
      return term.category === activeFilter;
    });

    if (firstVisibleTerm) dispatchEventHint(firstVisibleTerm.word);
  };

  render();
}

export { initMessiahExplorer };
