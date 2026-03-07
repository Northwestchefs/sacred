function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateVerse(verseObject, index = 0) {
  const errors = [];

  if (
    !(
      isNonEmptyString(verseObject.source) ||
      (verseObject.source && typeof verseObject.source === 'object')
    )
  ) {
    errors.push({ index, field: 'source', message: 'source must be a non-empty string or object.' });
  }

  if (!isNonEmptyString(verseObject.book)) {
    errors.push({ index, field: 'book', message: 'book must be a non-empty string.' });
  }

  if (!Number.isInteger(verseObject.chapter) || verseObject.chapter <= 0) {
    errors.push({ index, field: 'chapter', message: 'chapter must be a positive integer.' });
  }

  if (!Number.isInteger(verseObject.verse) || verseObject.verse <= 0) {
    errors.push({ index, field: 'verse', message: 'verse must be a positive integer.' });
  }

  if (!isNonEmptyString(verseObject.hebrew)) {
    errors.push({ index, field: 'hebrew', message: 'hebrew must be a non-empty UTF-8 string.' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateVerses(verses) {
  const errors = [];

  verses.forEach((verse, index) => {
    const result = validateVerse(verse, index);
    errors.push(...result.errors);
  });

  return {
    valid: errors.length === 0,
    errors,
    total: verses.length,
  };
}

module.exports = {
  validateVerse,
  validateVerses,
};
