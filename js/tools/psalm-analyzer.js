import { calculateGematria } from '../gematria.js';
import { getText } from '../sefaria-api.js';
import { mapGematriaToSefirot, mapVerseToSefirot } from '../sefirot-map.js';

const DIVINE_NAMES = ['יהוה', 'אלהים', 'אל', 'שדי', 'אדני', 'אהיה'];

function flattenText(text) {
  if (Array.isArray(text)) {
    return text.flat(Infinity).filter(Boolean).join(' ');
  }

  return String(text || '').trim();
}

function detectDivineNames(text = '') {
  return DIVINE_NAMES.filter((name) => text.includes(name));
}

function textFromVersion(version = {}) {
  if (Array.isArray(version?.text)) return version.text;
  if (Array.isArray(version?.chapter)) return version.chapter;

  if (version?.text && typeof version.text === 'object') {
    if (Array.isArray(version.text.he)) return version.text.he;
    if (Array.isArray(version.text.en)) return version.text.en;
  }

  if (version?.chapter && typeof version.chapter === 'object') {
    if (Array.isArray(version.chapter.he)) return version.chapter.he;
    if (Array.isArray(version.chapter.en)) return version.chapter.en;
  }

  return null;
}

function extractVerses(payload, { language, fallbackKeys = [] }) {
  for (const key of fallbackKeys) {
    const candidate = payload?.[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate) return [candidate];
  }

  const versions = Array.isArray(payload?.versions) ? payload.versions : [];
  const matchedVersion = versions.find((version) => {
    const labels = [version?.language, version?.lang, version?.languageFamilyName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return labels.some((value) => value.includes(language));
  });

  const extracted = textFromVersion(matchedVersion || versions[0]);
  if (Array.isArray(extracted)) return extracted;
  if (extracted) return [extracted];

  return [];
}

function toVerseAnalyses(textArray = [], englishArray = []) {
  return textArray.map((hebrewVerse, index) => {
    const verseNumber = index + 1;
    const englishVerse = String(englishArray[index] || '');
    const divineNamesDetected = detectDivineNames(hebrewVerse);
    const topicalHints = mapVerseToSefirot(`${englishVerse} ${hebrewVerse}`);
    const gematria = calculateGematria(hebrewVerse);
    const numericHints = mapGematriaToSefirot(gematria);

    return {
      verseNumber,
      gematria,
      divineNamesDetected,
      suggestedSefirah: topicalHints[0] || numericHints[0] || 'Tiferet',
    };
  });
}

export async function analyzePsalm(ref = 'Psalms 23') {
  const payload = await getText(ref);
  const hebrewVerses = extractVerses(payload, {
    language: 'he',
    fallbackKeys: ['he', 'hebrew'],
  });
  const englishVerses = extractVerses(payload, {
    language: 'en',
    fallbackKeys: ['text', 'en', 'english'],
  });

  const normalizedHebrew = Array.isArray(hebrewVerses)
    ? hebrewVerses.map((verse) => flattenText(verse))
    : [flattenText(hebrewVerses)];

  const normalizedEnglish = Array.isArray(englishVerses)
    ? englishVerses.map((verse) => flattenText(verse))
    : [flattenText(englishVerses)];

  return toVerseAnalyses(normalizedHebrew.filter(Boolean), normalizedEnglish);
}

export { DIVINE_NAMES };
