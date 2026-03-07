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

    const book = row.book || row.bookEnglish || row.book_name || row.bookName || row.b;
    const chapter = toNumber(row.chapter ?? row.c ?? row.chapterNumber);
    const verse = toNumber(row.verse ?? row.v ?? row.verseNumber);
    const hebrew = row.hebrew || row.text || row.h;

    return buildVerse({
      sourceId,
      book,
      chapter,
      verse,
      hebrew,
      note: row.note || row.notes,
      sourceFields: row,
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

    const bookName = bookNode.name || bookNode.book || bookNode.bookEnglish || bookNode.bookName;
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
            hebrew: verseNode.hebrew || verseNode.text || verseNode.h,
            note: verseNode.note || verseNode.notes,
            sourceFields: verseNode,
            warnings,
            context: `books[${bookIdx}].chapters[${chapterIdx}].verses[${verseIdx}]`
          })
        );
      });
    });
  });

  return verses;
}

function buildVerse({ sourceId, book, chapter, verse, hebrew, note, sourceFields, warnings, context }) {
  const bookMetadata = resolveBookMetadata(book);

  if (!bookMetadata) {
    warnings.push(`Could not resolve canonical metadata for book "${book}" at ${context}.`);
  }

  const normalizedBook = bookMetadata?.book || (typeof book === 'string' ? book.trim() : null);
  const sourceExtras = extractSourceExtras(sourceFields);

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
    transliteration: sourceFields?.transliteration ?? null,
    morphology: sourceFields?.morphology ?? null,
    lemma: sourceFields?.lemma ?? null,
    strongs: sourceFields?.strongs ?? null,
    notes: normalizeNotes(note),
    sourceExtras: Object.keys(sourceExtras).length > 0 ? sourceExtras : undefined
  };
}

function extractSourceExtras(sourceFields) {
  if (!sourceFields || typeof sourceFields !== 'object') {
    return {};
  }

  const known = new Set([
    'id',
    'source',
    'book',
    'bookEnglish',
    'bookHebrew',
    'book_name',
    'bookName',
    'bookSlug',
    'b',
    'chapter',
    'chapterNumber',
    'c',
    'verse',
    'verseNumber',
    'v',
    'number',
    'hebrew',
    'text',
    'h',
    'note',
    'notes',
    'transliteration',
    'morphology',
    'lemma',
    'strongs',
    'canonicalOrder',
    'text',
    'sourceExtras'
  ]);

  return Object.fromEntries(Object.entries(sourceFields).filter(([key]) => !known.has(key)));
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
