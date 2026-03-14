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
  if (!container) return;
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
    <article class="term-card" data-category="${term.category}" data-search="${`${term.word} ${term.transliteration} ${term.meaning} ${term.root}`.toLowerCase()}">
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
    <article class="term-card prophecy-card" data-category="prophecy" data-search="${`${item.title} ${item.reference} ${item.commentaryLinks.join(' ')}`.toLowerCase()}">
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
  const findPanelForButton = (button) => {
    const listItemPanel = button.closest('li')?.querySelector('.verse-panel');
    if (listItemPanel) return listItemPanel;
    return button.parentElement?.querySelector('.verse-panel') || null;
  };

  scope.querySelectorAll('.verse-expand').forEach((button) => {
    button.addEventListener('click', async () => {
      const reference = button.dataset.reference;
      const panel = findPanelForButton(button);
      if (!panel || !reference) return;
      panel.innerHTML = '<p>Loading Hebrew text…</p>';
      try {
        const data = await getVerseData(reference);
        panel.innerHTML = `
          <p class="hebrew-text">${data.hebrew || 'Hebrew text unavailable.'}</p>
          <p class="commentary-count">Commentary links: ${data.linksCount}</p>
        `;
      } catch (error) {
        console.error('[messiah] Verse data failed to load', reference, error);
        panel.innerHTML = `<p>Unable to load verse data: ${error.message}</p>`;
      }
    });
  });
}

function wireSearch(scope, searchState) {
  const input = scope.querySelector('#messiah-search');
  const results = scope.querySelector('#messiah-results-status');
  if (!input || !results) return;

  input.value = searchState.query;

  const applySearch = () => {
    const query = input.value.trim().toLowerCase();
    searchState.query = input.value;
    const cards = [...scope.querySelectorAll('.term-card')];
    let visibleCount = 0;

    cards.forEach((card) => {
      const searchable = card.dataset.search || card.textContent?.toLowerCase() || '';
      const matches = !query || searchable.includes(query);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    results.textContent = query
      ? `${visibleCount} result${visibleCount === 1 ? '' : 's'} for “${input.value.trim()}”.`
      : `${visibleCount} cards visible.`;
  };

  input.addEventListener('input', applySearch);
  applySearch();
}

function wireLoadVisible(scope) {
  const loadButton = scope.querySelector('#messiah-load-visible');
  if (!loadButton) return;

  loadButton.addEventListener('click', async () => {
    const visibleButtons = [...scope.querySelectorAll('.term-card:not([hidden]) .verse-expand')];
    for (const button of visibleButtons) {
      button.click();
    }
  });
}

function wireDetailsToggles(scope) {
  const expand = scope.querySelector('#messiah-expand-all');
  const collapse = scope.querySelector('#messiah-collapse-all');
  if (!expand || !collapse) return;

  expand.addEventListener('click', () => {
    scope.querySelectorAll('.term-card details').forEach((details) => {
      details.open = true;
    });
  });

  collapse.addEventListener('click', () => {
    scope.querySelectorAll('.term-card details').forEach((details) => {
      details.open = false;
    });
  });
}

function wireNavigation(scope) {
  const previousButton = scope.querySelector('#messiah-prev');
  const nextButton = scope.querySelector('#messiah-next');
  if (!previousButton || !nextButton) return;

  const focusCardAt = (targetIndex) => {
    const visibleCards = [...scope.querySelectorAll('.term-card:not([hidden])')];
    if (!visibleCards.length) return;

    const activeElement = document.activeElement;
    const currentIndex = visibleCards.findIndex((card) => card.contains(activeElement));
    const wrappedIndex = (targetIndex + visibleCards.length) % visibleCards.length;
    const nextCard = visibleCards[wrappedIndex];
    nextCard.setAttribute('tabindex', '-1');
    nextCard.focus();
  };

  previousButton.addEventListener('click', () => {
    const visibleCards = [...scope.querySelectorAll('.term-card:not([hidden])')];
    const activeElement = document.activeElement;
    const currentIndex = visibleCards.findIndex((card) => card.contains(activeElement));
    focusCardAt((currentIndex < 0 ? 0 : currentIndex) - 1);
  });

  nextButton.addEventListener('click', () => {
    const visibleCards = [...scope.querySelectorAll('.term-card:not([hidden])')];
    const activeElement = document.activeElement;
    const currentIndex = visibleCards.findIndex((card) => card.contains(activeElement));
    focusCardAt((currentIndex < 0 ? -1 : currentIndex) + 1);
  });
}

function initMessiahExplorer() {
  const container = document.getElementById('messiah-explorer');
  if (!container) {
    console.error('[messiah] #messiah-explorer container not found');
    return;
  }

  let activeFilter = 'all';
  const searchState = {
    query: 'mashiach',
  };

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
      <section class="messiah-controls" aria-label="Messiah explorer controls">
        <input id="messiah-search" type="search" placeholder="Search term, root, or reference" aria-label="Search terms" />
        <button type="button" class="button" id="messiah-expand-all">Expand all</button>
        <button type="button" class="button" id="messiah-collapse-all">Collapse all</button>
        <button type="button" class="button" id="messiah-load-visible">Load visible verses</button>
        <button type="button" class="button" id="messiah-prev">Previous</button>
        <button type="button" class="button" id="messiah-next">Next</button>
      </section>
      <p id="messiah-results-status" class="muted" aria-live="polite"></p>

      ${showTerms && coreCards ? `${renderSectionTitle('Core Messianic Titles', 'Key royal and symbolic names in messianic study.')}
      <section class="term-grid">${coreCards}</section>` : ''}

      ${showTerms && salvationCards ? `${renderSectionTitle('Salvation Language', 'Terms of rescue, redemption, atonement, and deliverance.')}
      <section class="term-grid">${salvationCards}</section>` : ''}

      ${showProphecy ? `${renderSectionTitle('Messianic Prophecies', 'Index of pivotal passages with expandable Hebrew text.')}
      <section class="term-grid">${prophecyCards}</section>` : ''}
    `;

    renderFilters(
      container.querySelector('#messiah-filters'),
      (filter) => {
        activeFilter = filter;
        render();
      },
      activeFilter,
    );

    wireVerseExpanders(container);
    wireDetailsToggles(container);
    wireNavigation(container);
    wireLoadVisible(container);
    wireSearch(container, searchState);

    const firstVisibleTerm = allTermCards.find((term) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'gematria') return term.gematria >= 180;
      return term.category === activeFilter;
    });

    if (firstVisibleTerm) dispatchEventHint(firstVisibleTerm.word);
    console.log(`[messiah] Explorer rendered with filter: ${activeFilter}`);
  };

  render();
}

export { initMessiahExplorer };
