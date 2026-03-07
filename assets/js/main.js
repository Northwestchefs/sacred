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
      status.textContent = 'Data layer placeholder: processed verse data is not present yet. Add reference/hebrew-bible/processed/verses.json to activate reader content.';
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
})();
