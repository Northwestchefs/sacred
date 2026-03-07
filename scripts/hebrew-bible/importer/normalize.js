function makeVerseId(bookEnglish, chapter, verse) {
  const bookSlug = String(bookEnglish || 'unknown-book')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${bookSlug}-${chapter}-${verse}`;
}

/**
 * Scaffold normalizer.
 *
 * Required fields in `input`:
 * - source (string or object)
 * - book (string)
 * - chapter (number)
 * - verse (number)
 * - hebrew (string)
 *
 * Optional fields:
 * - bookHebrew, bookEnglish, canonicalOrder, transliteration, morphology, lemma, strongs, notes
 */
function normalizeVerse(input) {
  const chapter = Number(input.chapter);
  const verse = Number(input.verse);

  return {
    id: input.id || makeVerseId(input.bookEnglish || input.book, chapter, verse),
    source: input.source,
    book: input.book,
    bookHebrew: input.bookHebrew || null,
    bookEnglish: input.bookEnglish || input.book,
    canonicalOrder: input.canonicalOrder ?? null,
    chapter,
    verse,
    hebrew: input.hebrew,
    transliteration: input.transliteration ?? null,
    morphology: input.morphology ?? null,
    lemma: input.lemma ?? null,
    strongs: input.strongs ?? null,
    notes: Array.isArray(input.notes) ? input.notes : [],
  };
}

module.exports = {
  makeVerseId,
  normalizeVerse,
};
