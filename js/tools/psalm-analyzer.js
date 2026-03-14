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
  const hebrewVerses = payload?.he || payload?.hebrew || payload?.versions?.[0]?.text?.he || [];
  const englishVerses = payload?.text || payload?.en || payload?.versions?.[0]?.text?.en || [];

  const normalizedHebrew = Array.isArray(hebrewVerses)
    ? hebrewVerses.map((verse) => flattenText(verse))
    : [flattenText(hebrewVerses)];

  const normalizedEnglish = Array.isArray(englishVerses)
    ? englishVerses.map((verse) => flattenText(verse))
    : [flattenText(englishVerses)];

  return toVerseAnalyses(normalizedHebrew.filter(Boolean), normalizedEnglish);
}

export { DIVINE_NAMES };
