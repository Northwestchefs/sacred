import { getText } from '../sefaria-api.js';

const DIVINE_NAMES = ['יהוה', 'אלהים', 'שדי', 'אהיה'];

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

export async function scanBookForDivineNames(book) {
  const normalizedBook = String(book || '').trim();
  if (!normalizedBook) throw new Error('A book is required to scan for divine names.');

  const payload = await getText(normalizedBook);
  const chapters = extractHebrewChapters(payload);

  return chapters.flatMap((chapterVerses, chapterIndex) => {
    if (!Array.isArray(chapterVerses)) return [];

    return chapterVerses.flatMap((verseText, verseIndex) => {
      const verse = flattenVerse(verseText);
      const ref = `${normalizedBook} ${chapterIndex + 1}:${verseIndex + 1}`;

      return DIVINE_NAMES.filter((name) => verse.includes(name)).map((name) => ({
        verse: ref,
        name,
      }));
    });
  });
}

export { DIVINE_NAMES };
