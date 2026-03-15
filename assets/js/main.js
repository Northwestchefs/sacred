(function () {
  function trackEvent(name, params = {}) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  }

  window.trackEvent = trackEvent;

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

  function suppressBrokenImages() {
    const images = document.querySelectorAll('img');
    if (!images.length) return;

    images.forEach((image) => {
      const source = image.getAttribute('src');
      if (!source || !source.trim()) {
        image.classList.add('is-broken-image');
        image.setAttribute('aria-hidden', 'true');
        return;
      }

      image.addEventListener('error', () => {
        image.classList.add('is-broken-image');
        image.setAttribute('aria-hidden', 'true');
      });
    });
  }

  function createOption(value, label, disabled) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (disabled) option.disabled = true;
    return option;
  }

  const TANAKH_BOOKS = [
    ['Genesis', 'בראשית'],
    ['Exodus', 'שמות'],
    ['Leviticus', 'ויקרא'],
    ['Numbers', 'במדבר'],
    ['Deuteronomy', 'דברים'],
    ['Joshua', 'יהושע'],
    ['Judges', 'שופטים'],
    ['1 Samuel', 'שמואל א׳'],
    ['2 Samuel', 'שמואל ב׳'],
    ['1 Kings', 'מלכים א׳'],
    ['2 Kings', 'מלכים ב׳'],
    ['Isaiah', 'ישעיהו'],
    ['Jeremiah', 'ירמיהו'],
    ['Ezekiel', 'יחזקאל'],
    ['Hosea', 'הושע'],
    ['Joel', 'יואל'],
    ['Amos', 'עמוס'],
    ['Obadiah', 'עובדיה'],
    ['Jonah', 'יונה'],
    ['Micah', 'מיכה'],
    ['Nahum', 'נחום'],
    ['Habakkuk', 'חבקוק'],
    ['Zephaniah', 'צפניה'],
    ['Haggai', 'חגי'],
    ['Zechariah', 'זכריה'],
    ['Malachi', 'מלאכי'],
    ['Psalms', 'תהילים'],
    ['Proverbs', 'משלי'],
    ['Job', 'איוב'],
    ['Song of Songs', 'שיר השירים'],
    ['Ruth', 'רות'],
    ['Lamentations', 'איכה'],
    ['Ecclesiastes', 'קהלת'],
    ['Esther', 'אסתר'],
    ['Daniel', 'דניאל'],
    ['Ezra', 'עזרא'],
    ['Nehemiah', 'נחמיה'],
    ['1 Chronicles', 'דברי הימים א׳'],
    ['2 Chronicles', 'דברי הימים ב׳'],
  ];

  const REMOTE_TEXTS_BASE_URL = 'https://www.sefaria.org/api/texts';

  function normalizeSlug(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }


  function getVerseReference(verse) {
    const bookLabel = verse.bookEnglish || verse.book || verse.bookSlug || 'Unknown';
    return `${bookLabel} ${verse.chapter}:${verse.verse}`;
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase();
  }

  function getBookLabel(verse) {
    return verse.bookEnglish || verse.book || verse.bookSlug || 'Unknown';
  }

  function buildReaderUrl({ book, chapter, verse }) {
    const params = new URLSearchParams();
    if (book) params.set('book', book);
    if (chapter) params.set('chapter', String(chapter));
    if (verse) params.set('verse', String(verse));

    const query = params.toString();
    return query ? `hebrew-bible/?${query}` : 'hebrew-bible/';
  }

  async function fetchJsonCandidates(paths) {
    let lastError = null;

    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length) {
          return { data, path };
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No data source could be loaded.');
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
    const homePassageForm = document.getElementById('home-passage-form');
    const homeBookSelect = document.getElementById('home-book-select');
    const homeChapterSelect = document.getElementById('home-chapter-select');
    const homeVerseInput = document.getElementById('home-verse-input');
    const spotlightReference = document.getElementById('home-spotlight-reference');
    const spotlightText = document.getElementById('home-spotlight-text');
    const spotlightLink = document.getElementById('home-spotlight-link');
    if (!form || !input || !status || !results) return;

    const readingSourceCandidates = ['reference/hebrew-bible/processed/verses.json'];
    const searchSourceCandidates = [
      'reference/english-bible/processed/verses.json',
      'reference/hebrew-bible/processed/verses.json',
    ];
    let readingVerses = [];
    let searchVerses = [];

    status.textContent = 'Loading searchable text…';
    try {
      const [readingData, searchData] = await Promise.all([
        fetchJsonCandidates(readingSourceCandidates),
        fetchJsonCandidates(searchSourceCandidates),
      ]);

      readingVerses = readingData.data;
      searchVerses = searchData.data;
      status.textContent = 'Search is ready.';

      if (statVerseCount) {
        statVerseCount.textContent = readingVerses.length.toLocaleString();
      }

      if (statBookCount || statChapterCount) {
        const books = new Set();
        const chapters = new Set();
        readingVerses.forEach((verse) => {
          const bookKey = verse.bookSlug || verse.bookEnglish || verse.book;
          if (bookKey) books.add(bookKey);
          if (bookKey && verse.chapter) {
            chapters.add(`${bookKey}:${verse.chapter}`);
          }
        });

        if (statBookCount) statBookCount.textContent = books.size.toLocaleString();
        if (statChapterCount) statChapterCount.textContent = chapters.size.toLocaleString();
      }

      if (homePassageForm && homeBookSelect && homeChapterSelect) {
        const booksBySlug = new Map();
        const chapterCountByBookSlug = new Map();

        TANAKH_BOOKS.forEach(([bookEnglish, bookHebrew], index) => {
          const slug = normalizeSlug(bookEnglish);
          booksBySlug.set(slug, {
            slug,
            label: bookEnglish,
            bookEnglish,
            bookHebrew,
            canonicalOrder: index + 1,
            chapters: new Set(),
          });
        });

        readingVerses.forEach((verse) => {
          const slug = verse.bookSlug;
          if (!slug) return;

          if (!booksBySlug.has(slug)) {
            booksBySlug.set(slug, {
              slug,
              label: getBookLabel(verse),
              canonicalOrder: Number(verse.canonicalOrder) || 999,
              chapters: new Set(),
            });
          }

          booksBySlug.get(slug).chapters.add(Number(verse.chapter));
        });

        async function fetchRemoteChapterCount(book) {
          if (chapterCountByBookSlug.has(book.slug)) {
            return chapterCountByBookSlug.get(book.slug);
          }

          const url = `${REMOTE_TEXTS_BASE_URL}/${encodeURIComponent(book.bookEnglish)}?lang=he&context=0&commentary=0&pad=0`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const payload = await response.json();
          const chapterCount = Array.isArray(payload?.he) ? payload.he.length : 0;
          chapterCountByBookSlug.set(book.slug, chapterCount);
          return chapterCount;
        }

        const orderedBooks = [...booksBySlug.values()].sort((a, b) => a.canonicalOrder - b.canonicalOrder);

        homeBookSelect.innerHTML = '';
        homeBookSelect.append(createOption('', 'Select a book', true));
        orderedBooks.forEach((book) => homeBookSelect.append(createOption(book.slug, book.label)));
        homeBookSelect.disabled = false;

        const populateHomeChapters = async (bookSlug) => {
          homeChapterSelect.innerHTML = '';
          const selectedBook = booksBySlug.get(bookSlug);
          if (!selectedBook) {
            homeChapterSelect.disabled = true;
            homeChapterSelect.append(createOption('', 'Select a book first', true));
            return;
          }

          const localChapters = [...selectedBook.chapters].sort((a, b) => a - b);
          const hasLocalChapters = localChapters.length > 0;

          homeChapterSelect.disabled = false;
          homeChapterSelect.append(createOption('', hasLocalChapters ? 'Select a chapter' : 'Loading chapters…', true));

          if (hasLocalChapters) {
            localChapters.forEach((chapter) => homeChapterSelect.append(createOption(String(chapter), `Chapter ${chapter}`)));
          }

          try {
            const chapterCount = await fetchRemoteChapterCount(selectedBook);
            if (homeBookSelect.value !== bookSlug) return;

            if (chapterCount > 0) {
              homeChapterSelect.innerHTML = '';
              homeChapterSelect.append(createOption('', 'Select a chapter', true));
              for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
                homeChapterSelect.append(createOption(String(chapter), `Chapter ${chapter}`));
              }
            }
          } catch {
            if (!hasLocalChapters) {
              homeChapterSelect.innerHTML = '';
              homeChapterSelect.disabled = true;
              homeChapterSelect.append(createOption('', 'Unable to load chapters', true));
            }
          }
        };

        homeBookSelect.addEventListener('change', () => {
          populateHomeChapters(homeBookSelect.value);
        });

        homePassageForm.addEventListener('submit', (event) => {
          event.preventDefault();
          if (!homeBookSelect.value || !homeChapterSelect.value) return;

          const verseValue = Number(homeVerseInput?.value);
          const verse = Number.isInteger(verseValue) && verseValue > 0 ? verseValue : undefined;
          window.location.href = buildReaderUrl({
            book: homeBookSelect.value,
            chapter: Number(homeChapterSelect.value),
            verse,
          });
        });
      }

      const spotlightVerses = readingVerses.length ? readingVerses : searchVerses;
      if (spotlightReference && spotlightText && spotlightLink && spotlightVerses.length) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        const spotlightVerse = spotlightVerses[dayOfYear % spotlightVerses.length];

        spotlightReference.textContent = getVerseReference(spotlightVerse);
        spotlightText.textContent = spotlightVerse.text || '';
        spotlightLink.href = buildReaderUrl({
          book: spotlightVerse.bookSlug,
          chapter: spotlightVerse.chapter,
          verse: spotlightVerse.verse,
        });
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

      const openLink = document.createElement('a');
      openLink.className = 'button button-secondary';
      openLink.href = buildReaderUrl({
        book: verse.bookSlug,
        chapter: verse.chapter,
        verse: verse.verse,
      });
      openLink.textContent = 'Open in reader';

      item.append(reference, text, openLink);
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
      matches = searchVerses.filter((verse) => {
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


  const cacheBust = () => {
    const links = document.querySelectorAll('script[src], link[href]');
    const version = Date.now();

    links.forEach((el) => {
      if (el.src) el.src = `${el.src.split('?')[0]}?v=${version}`;
      if (el.href && el.rel === 'stylesheet') el.href = `${el.href.split('?')[0]}?v=${version}`;
    });
  };

  function disableServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }

  window.addEventListener('load', cacheBust);
  window.addEventListener('load', disableServiceWorkers);

  setActiveNav();
  suppressBrokenImages();
  initReader();
  initHomeSearch();
})();
