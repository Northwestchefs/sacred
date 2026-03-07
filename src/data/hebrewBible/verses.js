import { safeParseInteger } from './utils.js';

function getVersesForBookAndChapter(verses, bookSlug, chapterNumber) {
  const chapter = safeParseInteger(chapterNumber);

  if (chapter === null) {
    return [];
  }

  return verses
    .filter((verse) => verse.__bookSlug === bookSlug && safeParseInteger(verse.chapter) === chapter)
    .sort((a, b) => {
      const aVerse = safeParseInteger(a.verse) ?? Number.MAX_SAFE_INTEGER;
      const bVerse = safeParseInteger(b.verse) ?? Number.MAX_SAFE_INTEGER;
      return aVerse - bVerse;
    })
    .map(({ __bookSlug, ...verse }) => verse);
}

function getVerseByReference(verses, bookSlug, chapterNumber, verseNumber) {
  const chapter = safeParseInteger(chapterNumber);
  const verse = safeParseInteger(verseNumber);

  if (chapter === null || verse === null) {
    return null;
  }

  const match = verses.find(
    (candidate) =>
      candidate.__bookSlug === bookSlug
      && safeParseInteger(candidate.chapter) === chapter
      && safeParseInteger(candidate.verse) === verse
  );

  if (!match) {
    return null;
  }

  const { __bookSlug, ...output } = match;
  return output;
}

export {
  getVerseByReference,
  getVersesForBookAndChapter,
};
