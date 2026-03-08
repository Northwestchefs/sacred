(function () {
  const dataCache = new Map();

  function setActiveNav() {
    const currentPage = document.body.dataset.page;
    if (!currentPage) return;

    document.querySelectorAll('[data-nav-key]').forEach((link) => {
      if (link.dataset.navKey === currentPage) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function createOption(value, label, disabled) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (disabled) option.disabled = true;
    return option;
  }


  function getVerseReference(verse) {
    const bookLabel = verse.bookEnglish || verse.book || verse.bookSlug || 'Unknown';
    return `${bookLabel} ${verse.chapter}:${verse.verse}`;
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
  }

  async function fetchJson(source) {
    if (dataCache.has(source)) {
      return dataCache.get(source);
    }

    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    dataCache.set(source, payload);
    return payload;
  }

  function initSearchShortcut(input) {
    if (!input) return;
    document.addEventListener('keydown', (event) => {
      if (event.key !== '/') return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      input.focus();
    });
  }

  function initDatasetStats(verses) {
    const totalVersesEl = document.getElementById('stats-total-verses');
    const totalBooksEl = document.getElementById('stats-total-books');
    const totalChaptersEl = document.getElementById('stats-total-chapters');
    if (!totalVersesEl || !totalBooksEl || !totalChaptersEl) return;

    const uniqueBooks = new Set();
    const uniqueChapters = new Set();

    verses.forEach((verse) => {
      const bookLabel = verse.bookSlug || verse.bookEnglish || verse.book;
      if (bookLabel) uniqueBooks.add(bookLabel);
      if (bookLabel && Number.isFinite(Number(verse.chapter))) {
        uniqueChapters.add(`${bookLabel}:${Number(verse.chapter)}`);
      }
    });

    totalVersesEl.textContent = formatNumber(verses.length);
    totalBooksEl.textContent = formatNumber(uniqueBooks.size);
    totalChaptersEl.textContent = formatNumber(uniqueChapters.size);
  }

  async function initHomeSearch() {
    const form = document.getElementById('home-search-form');
    const input = document.getElementById('home-search-input');
    const clear = document.getElementById('home-search-clear');
    const status = document.getElementById('home-search-status');
    const results = document.getElementById('home-search-results');
    if (!form || !input || !status || !results || !clear) return;

    const source = 'reference/hebrew-bible/processed/verses.json';
    let verses = [];
    let indexedVerses = [];
    const maxRenderCount = 50;

    initSearchShortcut(input);

    status.textContent = 'Loading searchable text…';
    try {
      verses = await fetchJson(source);
      indexedVerses = verses.map((verse) => ({
        verse,
        searchable: normalizeText(verse.text),
      }));
      initDatasetStats(verses);
      status.textContent = 'Search is ready.';
    } catch (error) {
      status.textContent = 'Search data could not be loaded right now. Please refresh and try again.';
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      results.innerHTML = '';

      if (!query) {
        status.textContent = 'Enter a word or phrase to search.';
        return;
      }

      const normalizedQuery = normalizeText(query);
      const startedAt = performance.now();
      const matches = indexedVerses
        .filter(({ searchable }) => searchable.includes(normalizedQuery))
        .map(({ verse }) => verse);
      const elapsed = Math.round(performance.now() - startedAt);

      if (!matches.length) {
        status.textContent = `No results for “${query}”.`;
        return;
      }

      const fragment = document.createDocumentFragment();
      const renderMatches = matches.slice(0, maxRenderCount);
      renderMatches.forEach((verse) => {
        const item = document.createElement('li');

        const reference = document.createElement('strong');
        reference.className = 'home-result-reference';
        reference.textContent = getVerseReference(verse);

        const text = document.createElement('p');
        text.className = 'home-result-text';
        text.textContent = verse.text || '';

        item.append(reference, text);
        fragment.append(item);
      });

      results.append(fragment);
      status.textContent = `${formatNumber(matches.length)} result${matches.length === 1 ? '' : 's'} found for “${query}” in ${elapsed}ms.`;
      if (matches.length > maxRenderCount) {
        status.textContent += ` Showing first ${maxRenderCount}.`;
      }
    });

    clear.addEventListener('click', () => {
      input.value = '';
      input.focus();
      status.textContent = 'Search cleared. Enter a new word or phrase.';
      results.innerHTML = '';
    });
  }

  async function initReader() {
    const readerRoot = document.querySelector('[data-reader]');
    if (!readerRoot) return;

    const bookSelect = document.getElementById('book-select');
    const chapterSelect = document.getElementById('chapter-select');
    const verseList = document.getElementById('verse-list');
    const status = document.getElementById('reader-status');
    const source = readerRoot.dataset.verseSource;

    if (!bookSelect || !chapterSelect || !verseList || !status || !source) return;

    bookSelect.innerHTML = '';
    chapterSelect.innerHTML = '';
    bookSelect.append(createOption('', 'Loading books…', true));
    chapterSelect.append(createOption('', 'Select a book first', true));

    let verses = [];
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      verses = await response.json();
    } catch (error) {
      status.textContent = 'Unable to load Scripture text right now. Please refresh and verify the verse data file is available.';
      bookSelect.innerHTML = '';
      chapterSelect.innerHTML = '';
      bookSelect.append(createOption('', 'No data loaded', true));
      chapterSelect.append(createOption('', 'No chapters available', true));
      bookSelect.disabled = true;
      chapterSelect.disabled = true;
      return;
    }

    const byBook = new Map();
    for (const verse of verses) {
      const key = verse.bookSlug || verse.bookEnglish || verse.book;
      if (!key) continue;
      if (!byBook.has(key)) {
        byBook.set(key, {
          key,
          label: verse.bookEnglish || verse.book || key,
          canonicalOrder: Number(verse.canonicalOrder) || 999,
          chapters: new Map(),
        });
      }
      const book = byBook.get(key);
      const chapterNumber = Number(verse.chapter);
      if (!book.chapters.has(chapterNumber)) {
        book.chapters.set(chapterNumber, []);
      }
      book.chapters.get(chapterNumber).push(verse);
    }

    const books = [...byBook.values()].sort((a, b) => a.canonicalOrder - b.canonicalOrder);

    bookSelect.disabled = false;
    bookSelect.innerHTML = '';
    bookSelect.append(createOption('', 'Select a book', true));
    books.forEach((book) => bookSelect.append(createOption(book.key, book.label)));

    function renderVerses(bookKey, chapterNumber) {
      const book = byBook.get(bookKey);
      const chapterVerses = book?.chapters.get(chapterNumber) || [];
      verseList.innerHTML = '';

      chapterVerses
        .sort((a, b) => Number(a.verse) - Number(b.verse))
        .forEach((verse) => {
          const item = document.createElement('li');
          const number = document.createElement('span');
          number.className = 'verse-number';
          number.textContent = String(verse.verse || '');

          const text = document.createElement('span');
          text.className = 'hebrew-text';
          text.textContent = verse.text || '';

          item.append(number, text);
          verseList.append(item);
        });

      status.textContent = chapterVerses.length
        ? `${book.label} ${chapterNumber} · ${chapterVerses.length} verses`
        : 'No verses found for the selected chapter.';
    }

    function populateChapters(bookKey) {
      const book = byBook.get(bookKey);
      chapterSelect.innerHTML = '';
      if (!book) {
        chapterSelect.disabled = true;
        chapterSelect.append(createOption('', 'Select a book first', true));
        return;
      }

      chapterSelect.disabled = false;
      chapterSelect.append(createOption('', 'Select a chapter', true));
      [...book.chapters.keys()]
        .sort((a, b) => a - b)
        .forEach((chapter) => chapterSelect.append(createOption(String(chapter), `Chapter ${chapter}`)));
    }

    bookSelect.addEventListener('change', () => {
      populateChapters(bookSelect.value);
      verseList.innerHTML = '';
      status.textContent = 'Select a chapter to read.';
    });

    chapterSelect.addEventListener('change', () => {
      const chapterNumber = Number(chapterSelect.value);
      if (!Number.isFinite(chapterNumber)) return;
      renderVerses(bookSelect.value, chapterNumber);
    });

    status.textContent = 'Processed data loaded. Select a book and chapter.';
  }

  setActiveNav();
  initReader();
  initHomeSearch();
})();
