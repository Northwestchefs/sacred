import { parseReferenceInput } from './parseReference.js';
import { hasChapter, hasVerse, searchHebrewText } from './searchIndex.js';

function formatReference(book, chapter, verse) {
  const label = book.bookEnglish || book.book || book.slug;

  if (chapter && verse) {
    return `${label} ${chapter}:${verse}`;
  }

  if (chapter) {
    return `${label} ${chapter}`;
  }

  return label;
}

function runSearchQuery({ query, books, searchIndex, options = {} }) {
  const {
    searchScope = 'all',
    selectedBookSlug = null,
  } = options;
  const trimmed = String(query ?? '').trim();

  if (!trimmed) {
    return {
      referenceResult: null,
      textResults: [],
      message: 'Enter a reference (for example, Genesis 1:1) or a Hebrew text phrase.',
    };
  }

  const parsedReference = parseReferenceInput(trimmed, books);
  let referenceResult = null;

  if (parsedReference?.book) {
    const { book, chapter, verse } = parsedReference;

    if (chapter && !hasChapter(searchIndex, book.slug, chapter)) {
      referenceResult = {
        type: 'error',
        message: `${formatReference(book, chapter)} is not available in the processed data.`,
      };
    } else if (chapter && verse && !hasVerse(searchIndex, book.slug, chapter, verse)) {
      referenceResult = {
        type: 'error',
        message: `${formatReference(book, chapter, verse)} is not available in the processed data.`,
      };
    } else {
      referenceResult = {
        type: 'reference',
        bookSlug: book.slug,
        chapter: chapter || 1,
        verse: verse || null,
        label: formatReference(book, chapter || 1, verse || null),
      };
    }
  }

  const scopedBookSlug = searchScope === 'current' ? selectedBookSlug : null;

  const textResults = searchHebrewText(searchIndex, trimmed, {
    bookSlug: scopedBookSlug,
  });

  return {
    referenceResult,
    textResults,
    searchedBookSlug: scopedBookSlug,
    message: !referenceResult && textResults.length === 0
      ? (scopedBookSlug ? 'No matching reference or verse text was found in the current book.' : 'No matching reference or verse text was found.')
      : '',
  };
}

export {
  runSearchQuery,
};
