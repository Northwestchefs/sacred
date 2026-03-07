const { resolveBookMetadata } = require('../lib/book-metadata');

function parseJsonSource({ payload, sourceId }) {
  const warnings = [];

  if (Array.isArray(payload)) {
    return {
      verses: normalizeFlatVerseArray(payload, sourceId, warnings),
      warnings,
      detectedStructure: 'array-of-verse-objects'
    };
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('JSON source must be an object or an array.');
  }

  if (Array.isArray(payload.verses)) {
    return {
      verses: normalizeFlatVerseArray(payload.verses, sourceId, warnings),
      warnings,
      detectedStructure: 'object-with-verses-array'
    };
  }

  if (Array.isArray(payload.books)) {
    return {
      verses: normalizeNestedBooks(payload.books, sourceId, warnings),
      warnings,
      detectedStructure: 'books-chapters-verses'
    };
  }

  throw new Error(
    'Unsupported JSON structure. Expected one of: top-level verse array, object.verses array, or object.books[].chapters[].verses[].'
  );
}

function normalizeFlatVerseArray(rows, sourceId, warnings) {
  return rows.map((row, idx) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`Verse row at index ${idx} is not an object.`);
    }

    const book = row.book || row.bookEnglish || row.book_name || row.b;
    const chapter = toNumber(row.chapter ?? row.c);
    const verse = toNumber(row.verse ?? row.v);
    const hebrew = row.hebrew || row.text || row.h;

    const note = row.note || row.notes;
    return buildVerse({
      sourceId,
      book,
      chapter,
      verse,
      hebrew,
      note,
      warnings,
      context: `rows[${idx}]`
    });
  });
}

function normalizeNestedBooks(books, sourceId, warnings) {
  const verses = [];

  books.forEach((bookNode, bookIdx) => {
    if (!bookNode || typeof bookNode !== 'object') {
      throw new Error(`books[${bookIdx}] is not an object.`);
    }

    const bookName = bookNode.name || bookNode.book || bookNode.bookEnglish;
    if (!Array.isArray(bookNode.chapters)) {
      throw new Error(`books[${bookIdx}] is missing chapters[].`);
    }

    bookNode.chapters.forEach((chapterNode, chapterIdx) => {
      if (!chapterNode || typeof chapterNode !== 'object') {
        throw new Error(`books[${bookIdx}].chapters[${chapterIdx}] is not an object.`);
      }

      const chapter = toNumber(chapterNode.number ?? chapterNode.chapter ?? chapterIdx + 1);
      const verseNodes = chapterNode.verses;
      if (!Array.isArray(verseNodes)) {
        throw new Error(`books[${bookIdx}].chapters[${chapterIdx}] is missing verses[].`);
      }

      verseNodes.forEach((verseNode, verseIdx) => {
        if (!verseNode || typeof verseNode !== 'object') {
          throw new Error(
            `books[${bookIdx}].chapters[${chapterIdx}].verses[${verseIdx}] is not an object.`
          );
        }

        verses.push(
          buildVerse({
            sourceId,
            book: bookName,
            chapter,
            verse: toNumber(verseNode.number ?? verseNode.verse ?? verseIdx + 1),
            hebrew: verseNode.hebrew || verseNode.text,
            note: verseNode.note || verseNode.notes,
            warnings,
            context: `books[${bookIdx}].chapters[${chapterIdx}].verses[${verseIdx}]`
          })
        );
      });
    });
  });

  return verses;
}

function buildVerse({ sourceId, book, chapter, verse, hebrew, note, warnings, context }) {
  const bookMetadata = resolveBookMetadata(book);

  if (!bookMetadata) {
    warnings.push(`Could not resolve canonical metadata for book "${book}" at ${context}.`);
  }

  const normalizedBook = bookMetadata?.book || (typeof book === 'string' ? book.trim() : null);

  return {
    id: makeVerseId(normalizedBook, chapter, verse),
    source: sourceId,
    book: normalizedBook,
    bookHebrew: bookMetadata?.bookHebrew || null,
    bookEnglish: bookMetadata?.bookEnglish || normalizedBook || null,
    canonicalOrder: bookMetadata?.canonicalOrder || null,
    chapter,
    verse,
    hebrew: typeof hebrew === 'string' ? hebrew.trim() : null,
    transliteration: null,
    morphology: null,
    lemma: null,
    strongs: null,
    notes: normalizeNotes(note)
  };
}

function normalizeNotes(note) {
  if (!note) {
    return [];
  }

  if (Array.isArray(note)) {
    return note.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim());
  }

  return typeof note === 'string' && note.trim() ? [note.trim()] : [];
}

function makeVerseId(book, chapter, verse) {
  const bookSlug = (book || 'unknown-book')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${bookSlug || 'unknown-book'}-${chapter || 'x'}-${verse || 'x'}`;
}

function toNumber(value) {
  if (Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

module.exports = {
  parseJsonSource
};
