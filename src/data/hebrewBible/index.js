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

function createHebrewBibleDataLayer(options = {}) {
  const {
    basePath = '',
    fetchFn = globalThis.fetch,
    versesPath = DEFAULT_VERSES_PATH,
    booksIndexPath = DEFAULT_BOOKS_INDEX_PATH,
    booksBasePath = DEFAULT_BOOKS_BASE_PATH,
  } = options;

  const state = {
    books: null,
    bookIndex: null,
    versesByBook: new Map(),
    allVersesCache: null,
    loadPromise: null,
    useBookFiles: false,
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

    const collected = [];
    for (const book of state.books) {
      const verses = await loadBookVerses(book);
      collected.push(...verses);
    }

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
