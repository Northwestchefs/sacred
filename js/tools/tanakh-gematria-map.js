import { calculateGematria } from '../gematria.js';
import { getText } from '../sefaria-api.js';

const bookDatasetCache = new Map();

function flattenVerse(text) {
  if (Array.isArray(text)) return text.flat(Infinity).filter(Boolean).join(' ');
  return String(text || '').trim();
}

function extractHebrewChapters(payload) {
  if (Array.isArray(payload?.he)) return payload.he;

  const versions = Array.isArray(payload?.versions) ? payload.versions : [];
  const hebrewVersion = versions.find((version) => {
    const labels = [version?.language, version?.lang, version?.languageFamilyName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return labels.some((label) => label.includes('he'));
  });

  if (Array.isArray(hebrewVersion?.text)) return hebrewVersion.text;
  if (Array.isArray(hebrewVersion?.chapter)) return hebrewVersion.chapter;

  return [];
}

export async function buildGematriaDataset(book) {
  const normalizedBook = String(book || '').trim();
  if (!normalizedBook) throw new Error('A book is required to build a gematria dataset.');
  if (bookDatasetCache.has(normalizedBook)) return bookDatasetCache.get(normalizedBook);

  const payload = await getText(normalizedBook);
  const chapters = extractHebrewChapters(payload);

  const dataset = chapters.flatMap((chapterVerses, chapterIndex) => {
    if (!Array.isArray(chapterVerses)) return [];

    return chapterVerses.map((verseText, verseIndex) => {
      const normalizedVerse = flattenVerse(verseText);
      return {
        book: normalizedBook,
        chapter: chapterIndex + 1,
        verse: verseIndex + 1,
        ref: `${normalizedBook} ${chapterIndex + 1}:${verseIndex + 1}`,
        text: normalizedVerse,
        gematria: calculateGematria(normalizedVerse),
      };
    });
  });

  bookDatasetCache.set(normalizedBook, dataset);
  return dataset;
}

export async function getGematriaDistribution(book) {
  const dataset = await buildGematriaDataset(book);
  const histogram = dataset.reduce((distribution, row) => {
    distribution[row.gematria] = (distribution[row.gematria] || 0) + 1;
    return distribution;
  }, {});

  return {
    book: String(book || '').trim(),
    totalVerses: dataset.length,
    distribution: histogram,
  };
}

export async function findVersesByGematria(value) {
  const target = Number(value);
  if (!Number.isFinite(target) || target < 0) {
    throw new Error('Gematria search value must be a non-negative number.');
  }

  const allDatasets = [...bookDatasetCache.values()].flat();
  return allDatasets
    .filter((entry) => entry.gematria === target)
    .map((entry) => ({
      verse: entry.ref,
      gematria: entry.gematria,
      text: entry.text,
    }));
}

export function getLoadedGematriaDataset() {
  return [...bookDatasetCache.values()].flat();
}
