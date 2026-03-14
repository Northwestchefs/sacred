import { safeParseInteger } from '../../data/hebrewBible/utils.js';

function getHebrewText(verse) {
  return verse.hebrew ?? verse.textHebrew ?? verse.text ?? '';
}

function normalizeHebrew(value) {
  return String(value ?? '').replace(/[\u0591-\u05C7]/g, '');
}

function buildSearchIndex(verses) {
  const byBook = new Map();

  for (const verse of verses) {
    const bookSlug = verse.bookSlug || verse.__bookSlug;
    const chapter = safeParseInteger(verse.chapter);
    const verseNumber = safeParseInteger(verse.verse);

    if (!bookSlug || chapter === null || verseNumber === null) {
      continue;
    }

    if (!byBook.has(bookSlug)) {
      byBook.set(bookSlug, {
        chapters: new Map(),
        verseMap: new Map(),
      });
    }

    const bookEntry = byBook.get(bookSlug);

    if (!bookEntry.chapters.has(chapter)) {
      bookEntry.chapters.set(chapter, new Set());
    }

    bookEntry.chapters.get(chapter).add(verseNumber);
    bookEntry.verseMap.set(`${chapter}:${verseNumber}`, verse);
  }

  return {
    verses,
    byBook,
  };
}

function hasChapter(index, bookSlug, chapter) {
  return index.byBook.get(bookSlug)?.chapters.has(chapter) ?? false;
}

function hasVerse(index, bookSlug, chapter, verse) {
  return index.byBook.get(bookSlug)?.verseMap.has(`${chapter}:${verse}`) ?? false;
}

function searchHebrewText(index, query, options = {}) {
  const {
    maxResults = Number.POSITIVE_INFINITY,
    bookSlug = null,
  } = options;
  const trimmed = String(query ?? '').trim();

  if (!trimmed) {
    return [];
  }

  const isHebrewQuery = /[\u0590-\u05FF]/.test(trimmed);
  const normalized = isHebrewQuery ? normalizeHebrew(trimmed) : trimmed.toLowerCase();

  const matches = [];

  for (const verse of index.verses) {
    if (bookSlug && verse.bookSlug !== bookSlug) {
      continue;
    }
    const text = getHebrewText(verse);
    const haystack = isHebrewQuery ? normalizeHebrew(text) : text.toLowerCase();

    if (!haystack.includes(normalized)) {
      continue;
    }

    matches.push({
      type: 'text',
      bookSlug: verse.bookSlug,
      bookEnglish: verse.bookEnglish || verse.book,
      bookHebrew: verse.bookHebrew,
      chapter: safeParseInteger(verse.chapter),
      verse: safeParseInteger(verse.verse),
      text,
    });

    if (Number.isFinite(maxResults) && matches.length >= maxResults) {
      break;
    }
  }

  return matches;
}

export {
  buildSearchIndex,
  hasChapter,
  hasVerse,
  searchHebrewText,
};
