import { MITZVOT_CATEGORIES, MITZVAH_TYPES } from '../modules/mitzvot-data.js';
import { loadMitzvot } from '../modules/mitzvot-loader.js';
import { filterByCategory, filterByType, searchMitzvot, setMitzvotCollection } from '../modules/mitzvot-filter.js';
import { renderMitzvahCard } from './mitzvah-card.js';

export async function initMitzvotDashboard(containerSelector, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const mitzvot = await loadMitzvot();
  setMitzvotCollection(mitzvot);

  container.innerHTML = `
    <div class="mitzvot-controls" role="group" aria-label="Mitzvot filters">
      <label for="mitzvot-search">Search</label>
      <input id="mitzvot-search" type="search" placeholder="Search by title, keyword, or source" />

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
    <div id="mitzvot-grid" class="mitzvot-grid" role="list" aria-label="Mitzvot list"></div>
  `;

  const searchInput = container.querySelector('#mitzvot-search');
  const categoryFilter = container.querySelector('#mitzvot-category-filter');
  const typeFilter = container.querySelector('#mitzvot-type-filter');
  const grid = container.querySelector('#mitzvot-grid');
  const resultsCount = container.querySelector('#mitzvot-results-count');

  function applyFilters() {
    const keywordMatches = searchMitzvot(searchInput?.value || '');
    const categoryMatches = filterByCategory(categoryFilter?.value || 'All');
    const typeMatches = filterByType(typeFilter?.value || 'All');

    const categoryIds = new Set(categoryMatches.map((item) => item.id));
    const typeIds = new Set(typeMatches.map((item) => item.id));

    const visible = keywordMatches.filter((item) => categoryIds.has(item.id) && typeIds.has(item.id));

    if (resultsCount) {
      resultsCount.textContent = `Showing ${visible.length} of ${mitzvot.length} mitzvot.`;
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (!visible.length) {
      grid.innerHTML = '<p class="reader-status">No mitzvot match the current filters.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    visible.forEach((mitzvah) => {
      fragment.appendChild(renderMitzvahCard(mitzvah, { onViewVerse: options.onViewVerse }));
    });

    grid.appendChild(fragment);
  }

  [searchInput, categoryFilter, typeFilter].forEach((node) => {
    node?.addEventListener('input', applyFilters);
    node?.addEventListener('change', applyFilters);
  });

  applyFilters();
}
