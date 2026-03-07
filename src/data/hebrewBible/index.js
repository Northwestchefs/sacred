import { buildBooksIndex, resolveBookIdentifier } from './books.js';
import { getChaptersForBookFromVerses } from './chapters.js';
import { getVerseByReference, getVersesForBookAndChapter } from './verses.js';
import { DEFAULT_VERSES_PATH, joinBasePath, normalizeSlug } from './utils.js';

function createHebrewBibleDataLayer(options = {}) {
  const {
    basePath = '',
    fetchFn = globalThis.fetch,
    versesPath = DEFAULT_VERSES_PATH,
  } = options;

  const state = {
    books: null,
    bookIndex: null,
    verses: null,
    loadPromise: null,
  };

  async function load() {
    if (state.loadPromise) {
      return state.loadPromise;
    }

    state.loadPromise = (async () => {
      if (typeof fetchFn !== 'function') {
        throw new Error('Unable to load Hebrew Bible data: fetch is not available in this runtime.');
      }

      const path = joinBasePath(basePath, versesPath);
      const response = await fetchFn(path);

      if (!response.ok) {
        throw new Error(`Unable to load Hebrew Bible data from ${path}: ${response.status} ${response.statusText}`);
      }

      const parsed = await response.json();

      if (!Array.isArray(parsed)) {
        throw new Error(`Expected an array of verses in ${path}.`);
      }

      state.verses = parsed.map((verse) => ({
        ...verse,
        __bookSlug: normalizeSlug(verse.bookSlug || verse.bookEnglish || verse.book || verse.bookHebrew),
      }));

      state.bookIndex = buildBooksIndex(state.verses);
      state.books = state.bookIndex.books;

      return {
        books: state.books,
        verses: state.verses,
      };
    })();

    return state.loadPromise;
  }

  async function ensureLoaded() {
    if (!state.books || !state.verses) {
      await load();
    }
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
    await ensureLoaded();
    const book = resolveBookIdentifier(state.bookIndex, bookIdentifier);

    if (!book) {
      return [];
    }

    return getChaptersForBookFromVerses(state.verses, book.slug);
  }

  async function getVerses(bookIdentifier, chapterNumber) {
    await ensureLoaded();
    const book = resolveBookIdentifier(state.bookIndex, bookIdentifier);

    if (!book) {
      return [];
    }

    return getVersesForBookAndChapter(state.verses, book.slug, chapterNumber);
  }

  async function getVerse(bookIdentifier, chapterNumber, verseNumber) {
    await ensureLoaded();
    const book = resolveBookIdentifier(state.bookIndex, bookIdentifier);

    if (!book) {
      return null;
    }

    return getVerseByReference(state.verses, book.slug, chapterNumber, verseNumber);
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
    warmCache,
  };
}

const defaultHebrewBibleDataLayer = createHebrewBibleDataLayer();

const getAllBooks = (...args) => defaultHebrewBibleDataLayer.getAllBooks(...args);
const getBook = (...args) => defaultHebrewBibleDataLayer.getBook(...args);
const getChaptersForBook = (...args) => defaultHebrewBibleDataLayer.getChaptersForBook(...args);
const getVerses = (...args) => defaultHebrewBibleDataLayer.getVerses(...args);
const getVerse = (...args) => defaultHebrewBibleDataLayer.getVerse(...args);
const warmCache = (...args) => defaultHebrewBibleDataLayer.warmCache(...args);

export {
  createHebrewBibleDataLayer,
  getAllBooks,
  getBook,
  getChaptersForBook,
  getVerse,
  getVerses,
  warmCache,
};
