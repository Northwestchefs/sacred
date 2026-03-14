import { MITZVOT_CATEGORIES, MITZVAH_TYPES } from '../modules/mitzvot-data.js';
import { loadMitzvot } from '../modules/mitzvot-loader.js';
import {
  filterByCategory,
  filterByType,
  getMitzvahByNumber,
  searchMitzvot,
  setMitzvotCollection,
} from '../modules/mitzvot-filter.js';
import { renderMitzvahCard } from './mitzvah-card.js';

export async function initMitzvotDashboard(containerSelector, options = {}) {
  const pageSize = 50;
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const mitzvot = await loadMitzvot();
  const firstLoadedMitzvah = mitzvot[0]?.id ?? 0;
  const lastLoadedMitzvah = mitzvot[mitzvot.length - 1]?.id ?? 0;
  setMitzvotCollection(mitzvot);

  container.innerHTML = `
    <div class="mitzvot-controls" role="group" aria-label="Mitzvot filters">
      <label for="mitzvot-search">Search</label>
      <input id="mitzvot-search" type="search" placeholder="Search by keyword or mitzvah number" />

      <label for="mitzvot-category-filter">Category</label>
      <select id="mitzvot-category-filter">
        <option value="All">All categories</option>
        ${MITZVOT_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
      </select>

      <label for="mitzvot-type-filter">Commandment type</label>
      <select id="mitzvot-type-filter">
        <option value="All">All types</option>
        ${MITZVAH_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}
      </select>
    </div>

    <p id="mitzvot-results-count" class="reader-status"></p>
    <div id="mitzvot-page-tabs" class="mitzvot-page-tabs" role="tablist" aria-label="Mitzvot page ranges"></div>
    <div id="mitzvot-grid" class="mitzvot-grid" role="list" aria-label="Mitzvot list"></div>
  `;

  const searchInput = container.querySelector('#mitzvot-search');
  const categoryFilter = container.querySelector('#mitzvot-category-filter');
  const typeFilter = container.querySelector('#mitzvot-type-filter');
  const grid = container.querySelector('#mitzvot-grid');
  const resultsCount = container.querySelector('#mitzvot-results-count');
  const pageTabs = container.querySelector('#mitzvot-page-tabs');
  let activePageIndex = 0;

  function buildPages(visible) {
    const pages = [];

    for (let start = 0; start < visible.length; start += pageSize) {
      pages.push({ start, end: Math.min(start + pageSize, visible.length) });
    }

    if (pages.length > 1) {
      const lastPage = pages[pages.length - 1];
      const lastPageLength = lastPage.end - lastPage.start;

      if (lastPageLength === 1) {
        pages[pages.length - 2].end = lastPage.end;
        pages.pop();
      }
    }

    return pages;
  }

  function getVisiblePage(visible) {
    if (!visible.length) return [];

    const pages = buildPages(visible);
    const pageCount = Math.max(1, pages.length);
    const safePageIndex = Math.min(activePageIndex, pageCount - 1);

    if (safePageIndex !== activePageIndex) {
      activePageIndex = safePageIndex;
    }

    const page = pages[safePageIndex];
    return visible.slice(page.start, page.end);
  }

  function renderPageTabs(visible) {
    if (!pageTabs) return;
    pageTabs.innerHTML = '';

    if (visible.length <= pageSize) {
      pageTabs.hidden = true;
      return;
    }

    pageTabs.hidden = false;
    const pages = buildPages(visible);
    const pageCount = pages.length;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pageStart = pages[pageIndex].start;
      const pageEnd = pages[pageIndex].end - 1;
      const startMitzvah = visible[pageStart]?.id ?? pageStart + 1;
      const endMitzvah = visible[pageEnd]?.id ?? pageEnd + 1;
      const tab = document.createElement('button');

      tab.type = 'button';
      tab.className = `mitzvot-page-tab${pageIndex === activePageIndex ? ' is-active' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', pageIndex === activePageIndex ? 'true' : 'false');
      tab.setAttribute('aria-controls', 'mitzvot-grid');
      tab.id = `mitzvot-page-tab-${pageIndex}`;
      tab.textContent = `${startMitzvah}-${endMitzvah}`;
      tab.addEventListener('click', () => {
        activePageIndex = pageIndex;
        applyFilters({ preservePage: true });
      });

      pageTabs.appendChild(tab);
    }
  }

  function renderVisibleMitzvot(visible) {
    const pages = buildPages(visible);
    const currentPage = getVisiblePage(visible);
    renderPageTabs(visible);

    const page = pages[activePageIndex] ?? { start: 0, end: 0 };
    const pageStart = page.start;
    const pageEnd = page.end;

    if (resultsCount) {
      resultsCount.textContent = visible.length
        ? `Showing ${pageStart + 1}-${pageEnd} of ${visible.length} filtered mitzvot (${mitzvot.length} total).`
        : `Showing 0 of ${mitzvot.length} mitzvot.`;
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (!currentPage.length) {
      grid.innerHTML = '<p class="reader-status">No mitzvot match the current filters.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    currentPage.forEach((mitzvah) => {
      fragment.appendChild(renderMitzvahCard(mitzvah, { onViewVerse: options.onViewVerse }));
    });

    grid.appendChild(fragment);
  }

  function navigateToMitzvah(number, collection = mitzvot) {
    const mitzvah = getMitzvahByNumber(number);
    if (!mitzvah) {
      if (resultsCount) {
        resultsCount.textContent = `Mitzvah not yet loaded. Currently available: ${firstLoadedMitzvah}–${lastLoadedMitzvah}.`;
      }
      return;
    }

    const matchIndex = collection.findIndex((item) => item.id === mitzvah.id);
    if (matchIndex === -1) {
      if (resultsCount) {
        resultsCount.textContent = `Mitzvah #${mitzvah.id} is outside the current filters.`;
      }
      return;
    }

    const pages = buildPages(collection);
    const matchPageIndex = pages.findIndex((page) => matchIndex >= page.start && matchIndex < page.end);
    activePageIndex = Math.max(0, matchPageIndex);
    renderVisibleMitzvot(collection);

    const card = container.querySelector(`#mitzvah-${mitzvah.id}`);
    if (!card) return;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('mitzvah-highlight');
    window.setTimeout(() => {
      card.classList.remove('mitzvah-highlight');
    }, 3000);
  }

  function applyFilters({ preservePage = false } = {}) {
    const rawSearch = (searchInput?.value || '').trim();
    const numericSearch = /^\d+$/.test(rawSearch);

    if (!preservePage) {
      activePageIndex = 0;
    }

    if (numericSearch) {
      const keywordMatches = searchMitzvot('');
      const categoryMatches = filterByCategory(categoryFilter?.value || 'All');
      const typeMatches = filterByType(typeFilter?.value || 'All');

      const categoryIds = new Set(categoryMatches.map((item) => item.id));
      const typeIds = new Set(typeMatches.map((item) => item.id));
      const filtered = keywordMatches.filter((item) => categoryIds.has(item.id) && typeIds.has(item.id));

      navigateToMitzvah(rawSearch, filtered);
      return;
    }

    const keywordMatches = searchMitzvot(rawSearch);
    const categoryMatches = filterByCategory(categoryFilter?.value || 'All');
    const typeMatches = filterByType(typeFilter?.value || 'All');

    const categoryIds = new Set(categoryMatches.map((item) => item.id));
    const typeIds = new Set(typeMatches.map((item) => item.id));

    const visible = keywordMatches.filter((item) => categoryIds.has(item.id) && typeIds.has(item.id));
    renderVisibleMitzvot(visible);
  }

  [searchInput, categoryFilter, typeFilter].forEach((node) => {
    node?.addEventListener('input', applyFilters);
    node?.addEventListener('change', applyFilters);
  });

  applyFilters();
}
