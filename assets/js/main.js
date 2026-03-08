(function () {
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

  async function initHomeSearch() {
    const form = document.getElementById('home-search-form');
    const input = document.getElementById('home-search-input');
    const status = document.getElementById('home-search-status');
    const results = document.getElementById('home-search-results');
    const clearButton = document.getElementById('home-search-clear');
    const navigation = document.getElementById('home-search-navigation');
    const previousButton = document.getElementById('home-search-previous');
    const nextButton = document.getElementById('home-search-next');
    const position = document.getElementById('home-search-position');
    const statBookCount = document.getElementById('stat-book-count');
    const statChapterCount = document.getElementById('stat-chapter-count');
    const statVerseCount = document.getElementById('stat-verse-count');
    if (!form || !input || !status || !results) return;

    const source = 'reference/hebrew-bible/processed/verses.json';
    let verses = [];

    status.textContent = 'Loading searchable text…';
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      verses = await response.json();
      status.textContent = 'Search is ready.';

      if (statVerseCount) {
        statVerseCount.textContent = verses.length.toLocaleString();
      }

      if (statBookCount || statChapterCount) {
        const books = new Set();
        const chapters = new Set();
        verses.forEach((verse) => {
          const bookKey = verse.bookSlug || verse.bookEnglish || verse.book;
          if (bookKey) books.add(bookKey);
          if (bookKey && verse.chapter) {
            chapters.add(`${bookKey}:${verse.chapter}`);
          }
        });

        if (statBookCount) statBookCount.textContent = books.size.toLocaleString();
        if (statChapterCount) statChapterCount.textContent = chapters.size.toLocaleString();
      }
    } catch (error) {
      status.textContent = 'Search data could not be loaded right now. Please refresh and try again.';
      return;
    }

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTypingElement =
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable);
      if (isTypingElement) return;
      if (event.key === '/') {
        event.preventDefault();
        input.focus();
      }
    });

    let matches = [];
    let activeResultIndex = 0;

    function updateNavigationState() {
      if (!navigation || !previousButton || !nextButton || !position) return;
      const hasResults = matches.length > 0;
      navigation.hidden = !hasResults;

      if (!hasResults) {
        position.textContent = '';
        previousButton.disabled = true;
        nextButton.disabled = true;
        return;
      }

      position.textContent = `Verse ${activeResultIndex + 1} of ${matches.length}`;
      previousButton.disabled = matches.length === 1;
      nextButton.disabled = matches.length === 1;
    }

    function showActiveResult() {
      results.innerHTML = '';
      if (!matches.length) {
        updateNavigationState();
        return;
      }

      const verse = matches[activeResultIndex];
      const item = document.createElement('li');

      const reference = document.createElement('strong');
      reference.className = 'home-result-reference';
      reference.textContent = getVerseReference(verse);

      const text = document.createElement('p');
      text.className = 'home-result-text';
      text.textContent = verse.text || '';

      item.append(reference, text);
      results.append(item);
      updateNavigationState();
    }

    function clearSearchResults() {
      matches = [];
      activeResultIndex = 0;
      results.innerHTML = '';
      updateNavigationState();
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        input.value = '';
        clearSearchResults();
        status.textContent = 'Search is ready.';
        input.focus();
      });
    }

    if (previousButton) {
      previousButton.addEventListener('click', () => {
        if (!matches.length) return;
        activeResultIndex = (activeResultIndex - 1 + matches.length) % matches.length;
        showActiveResult();
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        if (!matches.length) return;
        activeResultIndex = (activeResultIndex + 1) % matches.length;
        showActiveResult();
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      clearSearchResults();

      if (!query) {
        status.textContent = 'Enter a word or phrase to search.';
        return;
      }

      const normalizedQuery = normalizeText(query);
      matches = verses.filter((verse) => {
        const searchable = normalizeText(verse.text);
        return searchable.includes(normalizedQuery);
      });

      if (!matches.length) {
        status.textContent = `No results for “${query}”.`;
        return;
      }

      activeResultIndex = 0;
      showActiveResult();
      status.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} found for “${query}”. Use Next and Previous to move through verses.`;
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
