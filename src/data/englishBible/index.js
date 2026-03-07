function joinBasePath(basePath, path) {
  const normalizedBase = String(basePath || '').replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');

  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }

  return `${normalizedBase}/${normalizedPath}`;
}

function createEnglishBibleDataLayer(options = {}) {
  const {
    basePath = '',
    fetchFn = globalThis.fetch,
    booksIndexPath = 'reference/english-bible/processed/books.json',
    booksBasePath = 'reference/english-bible/processed/books',
  } = options;

  const state = {
    books: null,
    chaptersByBook: new Map(),
    loadPromise: null,
  };

  async function fetchJson(path) {
    const response = await fetchFn(path);

    if (!response.ok) {
      throw new Error(`Unable to load English Bible data from ${path}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async function ensureLoaded() {
    if (state.loadPromise) {
      return state.loadPromise;
    }

    state.loadPromise = (async () => {
      const path = joinBasePath(basePath, booksIndexPath);
      const books = await fetchJson(path);
      if (!Array.isArray(books)) {
        throw new Error(`Expected an array in ${path}.`);
      }
      state.books = books;
      return books;
    })();

    return state.loadPromise;
  }

  async function getBooks() {
    await ensureLoaded();
    return [...(state.books || [])];
  }

  async function getChapterVerses(bookSlug, chapterNumber) {
    await ensureLoaded();

    const chapter = Number(chapterNumber);
    if (!Number.isInteger(chapter) || chapter <= 0) {
      return [];
    }

    if (!state.chaptersByBook.has(bookSlug)) {
      const book = (state.books || []).find((entry) => entry.slug === bookSlug);
      if (!book) {
        return [];
      }

      const file = String(book.file || `${bookSlug}.json`).replace(/^books\//, '');
      const path = joinBasePath(basePath, `${booksBasePath}/${file}`);
      const payload = await fetchJson(path);
      state.chaptersByBook.set(bookSlug, payload?.chapters || {});
    }

    const chapters = state.chaptersByBook.get(bookSlug) || {};
    const verses = chapters[String(chapter)] || [];

    return verses.map((verse) => ({ ...verse }));
  }

  return {
    getBooks,
    getChapterVerses,
  };
}

export {
  createEnglishBibleDataLayer,
};
