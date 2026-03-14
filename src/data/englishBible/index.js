import { buildTanakhBookCatalog } from '../hebrewBible/tanakhBooks.js';

const DEFAULT_REMOTE_TEXTS_BASE_URL = 'https://www.sefaria.org/api/texts';

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
    enableRemoteFallback = true,
    remoteTextsBaseUrl = DEFAULT_REMOTE_TEXTS_BASE_URL,
  } = options;

  const state = {
    books: null,
    chaptersByBook: new Map(),
    loadPromise: null,
    useRemoteProvider: false,
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

      if (enableRemoteFallback && isLikelyBootstrapSample(books)) {
        state.books = buildTanakhBookCatalog();
        state.useRemoteProvider = true;
      }

      return books;
    })();

    return state.loadPromise;
  }

  async function getBooks() {
    await ensureLoaded();
    return [...(state.books || [])];
  }

  function isLikelyBootstrapSample(books) {
    if (!Array.isArray(books)) {
      return false;
    }

    if (books.length <= 2) {
      return true;
    }

    const totalChapters = books.reduce((count, book) => count + Number(book.chapterCount || 0), 0);
    return totalChapters <= 3;
  }

  function decodeHtmlEntities(value) {
    const entityMap = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
      thinsp: ' ',
    };

    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token) => {
      const normalized = String(token || '').toLowerCase();

      if (Object.prototype.hasOwnProperty.call(entityMap, normalized)) {
        return entityMap[normalized];
      }

      if (normalized.startsWith('#x')) {
        const codePoint = Number.parseInt(normalized.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      }

      if (normalized.startsWith('#')) {
        const codePoint = Number.parseInt(normalized.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      }

      return entity;
    });
  }

  function stripMarkup(text) {
    const withoutFootnotes = String(text ?? '')
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
      .replace(/<i\b[^>]*class=["'][^"']*footnote[^"']*["'][^>]*>[\s\S]*?<\/i>/gi, '');

    const withoutTags = withoutFootnotes.replace(/<[^>]+>/g, '');
    const decoded = decodeHtmlEntities(withoutTags);

    return decoded
      .replace(/\{[^}]{1,8}\}/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function fetchRemoteBookPayload(bookSlug) {
    const book = (state.books || []).find((entry) => entry.slug === bookSlug);
    if (!book) {
      return { chapters: {} };
    }

    const url = `${remoteTextsBaseUrl}/${encodeURIComponent(book.remoteRef || book.bookEnglish || book.book)}?lang=en&context=0&commentary=0&pad=0`;
    const payload = await fetchJson(url);
    const chapters = Array.isArray(payload?.text) ? payload.text : [];
    const normalized = {};

    chapters.forEach((chapterVerses, chapterIndex) => {
      if (!Array.isArray(chapterVerses)) {
        return;
      }

      const chapter = chapterIndex + 1;
      normalized[String(chapter)] = chapterVerses.map((verseText, verseIndex) => ({
        id: `${book.slug}-${chapter}-${verseIndex + 1}`,
        source: 'sefaria',
        book: book.book,
        bookEnglish: book.bookEnglish,
        bookHebrew: book.bookHebrew,
        canonicalOrder: book.canonicalOrder,
        bookSlug: book.slug,
        chapter,
        verse: verseIndex + 1,
        english: stripMarkup(verseText),
        text: stripMarkup(verseText),
      }));
    });

    return {
      chapters: normalized,
    };
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

      let payload = null;

      if (state.useRemoteProvider) {
        payload = await fetchRemoteBookPayload(bookSlug);
      } else {
        const file = String(book.file || `${bookSlug}.json`).replace(/^books\//, '');
        const path = joinBasePath(basePath, `${booksBasePath}/${file}`);
        payload = await fetchJson(path);
      }

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
