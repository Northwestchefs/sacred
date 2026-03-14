import { buildBooksIndex, resolveBookIdentifier } from './books.js';
import { getChaptersForBookFromVerses } from './chapters.js';
import { getVerseByReference, getVersesForBookAndChapter } from './verses.js';
import {
  DEFAULT_BOOKS_BASE_PATH,
  DEFAULT_BOOKS_INDEX_PATH,
  DEFAULT_VERSES_PATH,
  joinBasePath,
  normalizeSlug,
} from './utils.js';
import { buildTanakhBookCatalog } from './tanakhBooks.js';

const DEFAULT_REMOTE_TEXTS_BASE_URL = 'https://www.sefaria.org/api/texts';

function createHebrewBibleDataLayer(options = {}) {
  const {
    basePath = '',
    fetchFn = globalThis.fetch,
    versesPath = DEFAULT_VERSES_PATH,
    booksIndexPath = DEFAULT_BOOKS_INDEX_PATH,
    booksBasePath = DEFAULT_BOOKS_BASE_PATH,
    enableRemoteFallback = true,
    remoteTextsBaseUrl = DEFAULT_REMOTE_TEXTS_BASE_URL,
  } = options;

  const state = {
    books: null,
    bookIndex: null,
    versesByBook: new Map(),
    allVersesCache: null,
    loadPromise: null,
    useBookFiles: false,
    useRemoteProvider: false,
  };

  async function fetchJson(path) {
    const response = await fetchFn(path);
    if (!response.ok) {
      throw new Error(`Unable to load Hebrew Bible data from ${path}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  function normalizeVerse(verse) {
    return {
      ...verse,
      bookSlug: normalizeSlug(verse.bookSlug || verse.bookEnglish || verse.book || verse.bookHebrew),
    };
  }

  async function loadUsingBookFiles() {
    const indexPath = joinBasePath(basePath, booksIndexPath);
    const parsed = await fetchJson(indexPath);

    if (!Array.isArray(parsed)) {
      throw new Error(`Expected an array of books in ${indexPath}.`);
    }

    const seedVerses = parsed.map((book) => ({
      book: book.book,
      bookEnglish: book.bookEnglish,
      bookHebrew: book.bookHebrew,
      canonicalOrder: book.canonicalOrder,
      chapter: 1,
      verse: 1,
      hebrew: '__seed__',
      bookSlug: book.slug,
    }));

    state.books = parsed.map((book) => ({
      id: book.slug,
      slug: book.slug,
      book: book.book,
      bookEnglish: book.bookEnglish,
      bookHebrew: book.bookHebrew,
      canonicalOrder: book.canonicalOrder,
      aliases: [book.book, book.bookEnglish, book.bookHebrew].filter(Boolean),
      chapterCount: book.chapterCount ?? null,
      verseCount: book.verseCount ?? null,
      file: book.file || `${book.slug}.json`,
    }));

    state.bookIndex = buildBooksIndex(seedVerses);
    state.bookIndex.books = state.books;
    state.useBookFiles = true;
  }

  async function loadUsingVersesFile() {
    const path = joinBasePath(basePath, versesPath);
    const parsed = await fetchJson(path);

    if (!Array.isArray(parsed)) {
      throw new Error(`Expected an array of verses in ${path}.`);
    }

    const verses = parsed.map(normalizeVerse);
    state.allVersesCache = verses;
    state.bookIndex = buildBooksIndex(verses);
    state.books = state.bookIndex.books;
    state.useBookFiles = false;
  }

  function isLikelyBootstrapSample() {
    if (!Array.isArray(state.books)) {
      return false;
    }

    if (state.books.length <= 1) {
      return true;
    }

    return Array.isArray(state.allVersesCache) && state.allVersesCache.length <= 10;
  }

  async function loadUsingRemoteProvider() {
    const books = buildTanakhBookCatalog();

    const seedVerses = books.map((book) => ({
      ...book,
      chapter: 1,
      verse: 1,
      hebrew: '__seed__',
      bookSlug: book.slug,
    }));

    state.books = books;
    state.bookIndex = buildBooksIndex(seedVerses);
    state.bookIndex.books = books;
    state.useBookFiles = false;
    state.useRemoteProvider = true;
    state.allVersesCache = null;
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

  async function fetchRemoteBookVerses(book) {
    const url = `${remoteTextsBaseUrl}/${encodeURIComponent(book.remoteRef || book.bookEnglish || book.book)}?lang=he&context=0&commentary=0&pad=0`;
    const payload = await fetchJson(url);
    const chapters = Array.isArray(payload?.he) ? payload.he : [];
    const normalized = [];

    chapters.forEach((chapterVerses, chapterIndex) => {
      if (!Array.isArray(chapterVerses)) {
        return;
      }

      chapterVerses.forEach((verseText, verseIndex) => {
        normalized.push({
          id: `${book.slug}-${chapterIndex + 1}-${verseIndex + 1}`,
          source: 'sefaria',
          book: book.book,
          bookEnglish: book.bookEnglish,
          bookHebrew: book.bookHebrew,
          canonicalOrder: book.canonicalOrder,
          bookSlug: book.slug,
          chapter: chapterIndex + 1,
          verse: verseIndex + 1,
          hebrew: stripMarkup(verseText),
        });
      });
    });

    return normalized;
  }

  async function load() {
    if (state.loadPromise) {
      return state.loadPromise;
    }

    state.loadPromise = (async () => {
      if (typeof fetchFn !== 'function') {
        throw new Error('Unable to load Hebrew Bible data: fetch is not available in this runtime.');
      }

      try {
        await loadUsingBookFiles();
      } catch (_error) {
        await loadUsingVersesFile();
      }

      if (enableRemoteFallback && isLikelyBootstrapSample()) {
        try {
          await loadUsingRemoteProvider();
        } catch {
          // Continue with local sample data if remote provider is unavailable.
        }
      }

      return {
        books: state.books,
      };
    })();

    return state.loadPromise;
  }

  async function ensureLoaded() {
    if (!state.books || !state.bookIndex) {
      await load();
    }
  }

  async function loadBookVerses(book) {
    await ensureLoaded();

    if (!state.useBookFiles) {
      if (state.useRemoteProvider) {
        if (state.versesByBook.has(book.slug)) {
          return state.versesByBook.get(book.slug);
        }

        const verses = await fetchRemoteBookVerses(book);
        state.versesByBook.set(book.slug, verses);
        return verses;
      }

      return state.allVersesCache.filter((verse) => verse.bookSlug === book.slug);
    }

    if (state.versesByBook.has(book.slug)) {
      return state.versesByBook.get(book.slug);
    }

    const filePath = book.file?.startsWith('books/') ? book.file.replace(/^books\//, '') : `${book.slug}.json`;
    const path = joinBasePath(basePath, `${booksBasePath}/${filePath}`);
    const parsed = await fetchJson(path);

    const rawVerses = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed?.chapters || {}).flatMap((verses) => (Array.isArray(verses) ? verses : []));

    const verses = rawVerses.map(normalizeVerse);
    state.versesByBook.set(book.slug, verses);
    return verses;
  }

  async function getAllBooks() {
    await ensureLoaded();
    return [...state.books];
  }

  async function getBook(bookIdentifier) {
    await ensureLoaded();
    return resolveBookIdentifier(state.bookIndex, bookIdentifier);
  }

  async function getChaptersForBook(bookIdentifier) {
    const book = await getBook(bookIdentifier);
    if (!book) {
      return [];
    }

    const verses = await loadBookVerses(book);
    return getChaptersForBookFromVerses(verses, book.slug);
  }

  async function getVerses(bookIdentifier, chapterNumber) {
    const book = await getBook(bookIdentifier);
    if (!book) {
      return [];
    }

    const verses = await loadBookVerses(book);
    return getVersesForBookAndChapter(verses, book.slug, chapterNumber);
  }

  async function getAllVerses() {
    await ensureLoaded();

    if (state.allVersesCache) {
      return state.allVersesCache.map((verse) => ({ ...verse }));
    }

    const collected = (await Promise.all(state.books.map((book) => loadBookVerses(book)))).flat();

    state.allVersesCache = collected;
    return collected.map((verse) => ({ ...verse }));
  }

  async function getVerse(bookIdentifier, chapterNumber, verseNumber) {
    const book = await getBook(bookIdentifier);
    if (!book) {
      return null;
    }

    const verses = await loadBookVerses(book);
    return getVerseByReference(verses, book.slug, chapterNumber, verseNumber);
  }

  async function warmCache() {
    await ensureLoaded();
  }

  return {
    getAllBooks,
    getBook,
    getChaptersForBook,
    getVerse,
    getVerses,
    getAllVerses,
    warmCache,
  };
}

const defaultHebrewBibleDataLayer = createHebrewBibleDataLayer();

const getAllBooks = (...args) => defaultHebrewBibleDataLayer.getAllBooks(...args);
const getBook = (...args) => defaultHebrewBibleDataLayer.getBook(...args);
const getChaptersForBook = (...args) => defaultHebrewBibleDataLayer.getChaptersForBook(...args);
const getVerses = (...args) => defaultHebrewBibleDataLayer.getVerses(...args);
const getVerse = (...args) => defaultHebrewBibleDataLayer.getVerse(...args);
const getAllVerses = (...args) => defaultHebrewBibleDataLayer.getAllVerses(...args);
const warmCache = (...args) => defaultHebrewBibleDataLayer.warmCache(...args);

export {
  createHebrewBibleDataLayer,
  getAllBooks,
  getBook,
  getChaptersForBook,
  getVerse,
  getVerses,
  getAllVerses,
  warmCache,
};
