import { safeParseInteger } from './utils.js';

function getChaptersForBookFromVerses(verses, bookSlug) {
  const chapterMap = new Map();

  for (const verse of verses) {
    if (verse.__bookSlug !== bookSlug) {
      continue;
    }

    const chapterNumber = safeParseInteger(verse.chapter);

    if (chapterNumber === null) {
      continue;
    }

    if (!chapterMap.has(chapterNumber)) {
      chapterMap.set(chapterNumber, {
        chapter: chapterNumber,
        verseCount: 0,
      });
    }

    chapterMap.get(chapterNumber).verseCount += 1;
  }

  return [...chapterMap.values()].sort((a, b) => a.chapter - b.chapter);
}

export {
  getChaptersForBookFromVerses,
};
