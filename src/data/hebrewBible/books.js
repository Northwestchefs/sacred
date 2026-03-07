import { dedupe, normalizeSlug, safeParseInteger, sortByCanonicalOrderThenLabel } from './utils.js';

function getBookLabels(verse) {
  return dedupe([
    verse.book,
    verse.bookEnglish,
    verse.bookHebrew,
  ].filter(Boolean));
}

function buildBooksIndex(verses) {
  const bySlug = new Map();

  for (const verse of verses) {
    const fallbackLabel = verse.bookEnglish || verse.book || verse.bookHebrew;
    const slug = normalizeSlug(verse.bookSlug || fallbackLabel);

    if (!slug) {
      continue;
    }

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        id: slug,
        slug,
        book: verse.book ?? null,
        bookEnglish: verse.bookEnglish ?? verse.book ?? null,
        bookHebrew: verse.bookHebrew ?? null,
        canonicalOrder: safeParseInteger(verse.canonicalOrder),
        aliases: getBookLabels(verse),
        chapterSet: new Set(),
        verseCount: 0,
      });
    }

    const current = bySlug.get(slug);
    const chapter = safeParseInteger(verse.chapter);

    current.verseCount += 1;

    if (chapter !== null) {
      current.chapterSet.add(chapter);
    }
  }

  const books = sortByCanonicalOrderThenLabel(
    [...bySlug.values()].map((book) => ({
      id: book.id,
      slug: book.slug,
      book: book.book,
      bookEnglish: book.bookEnglish,
      bookHebrew: book.bookHebrew,
      canonicalOrder: book.canonicalOrder,
      aliases: book.aliases,
      chapterCount: book.chapterSet.size,
      verseCount: book.verseCount,
    }))
  );

  const byOrder = new Map();

  for (const book of books) {
    if (book.canonicalOrder !== null) {
      byOrder.set(book.canonicalOrder, book);
    }
  }

  return {
    books,
    bySlug: new Map(books.map((book) => [book.slug, book])),
    byOrder,
  };
}

function resolveBookIdentifier(bookIndex, bookIdentifier) {
  if (bookIdentifier == null) {
    return null;
  }

  const asOrder = safeParseInteger(bookIdentifier);

  if (asOrder !== null && bookIndex.byOrder.has(asOrder)) {
    return bookIndex.byOrder.get(asOrder);
  }

  const slug = normalizeSlug(bookIdentifier);

  if (slug && bookIndex.bySlug.has(slug)) {
    return bookIndex.bySlug.get(slug);
  }

  for (const book of bookIndex.books) {
    if (book.aliases.some((alias) => normalizeSlug(alias) === slug)) {
      return book;
    }
  }

  return null;
}

export {
  buildBooksIndex,
  resolveBookIdentifier,
};
