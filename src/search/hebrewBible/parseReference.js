import { normalizeSlug, safeParseInteger } from '../../data/hebrewBible/utils.js';

function buildBookLookupEntries(book) {
  return [
    book.slug,
    book.book,
    book.bookEnglish,
    book.bookHebrew,
    ...(Array.isArray(book.aliases) ? book.aliases : []),
  ].filter(Boolean);
}

function resolveBookToken(books, token) {
  const normalizedToken = normalizeSlug(token);

  if (!normalizedToken) {
    return null;
  }

  const exact = books.find((book) => normalizeSlug(book.slug) === normalizedToken
    || buildBookLookupEntries(book).some((entry) => normalizeSlug(entry) === normalizedToken));

  if (exact) {
    return exact;
  }

  return books.find((book) => buildBookLookupEntries(book).some((entry) => normalizeSlug(entry).startsWith(normalizedToken)));
}

function parseReferenceInput(query, books) {
  const trimmed = String(query ?? '').trim();

  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, ' ');
  const colonMatch = compact.match(/^(.+?)\s+(\d+):(\d+)$/);

  if (colonMatch) {
    const book = resolveBookToken(books, colonMatch[1]);

    return {
      book,
      chapter: safeParseInteger(colonMatch[2]),
      verse: safeParseInteger(colonMatch[3]),
      raw: trimmed,
    };
  }

  const chapterVerseMatch = compact.match(/^(.+?)\s+(\d+)\s+(\d+)$/);

  if (chapterVerseMatch) {
    const book = resolveBookToken(books, chapterVerseMatch[1]);

    return {
      book,
      chapter: safeParseInteger(chapterVerseMatch[2]),
      verse: safeParseInteger(chapterVerseMatch[3]),
      raw: trimmed,
    };
  }

  const chapterMatch = compact.match(/^(.+?)\s+(\d+)$/);

  if (chapterMatch) {
    const book = resolveBookToken(books, chapterMatch[1]);

    return {
      book,
      chapter: safeParseInteger(chapterMatch[2]),
      verse: null,
      raw: trimmed,
    };
  }

  return {
    book: resolveBookToken(books, compact),
    chapter: null,
    verse: null,
    raw: trimmed,
  };
}

export {
  parseReferenceInput,
  resolveBookToken,
};
