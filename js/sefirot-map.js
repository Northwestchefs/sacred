import { mapDivineNameToSefirah } from './divine-names.js';

export const SEFIROT = [
  'Keter',
  'Chokhmah',
  'Binah',
  'Chesed',
  'Gevurah',
  'Tiferet',
  'Netzach',
  'Hod',
  'Yesod',
  'Malkhut',
];

const VERSE_KEYWORD_MAP = {
  wisdom: 'Chokhmah',
  understanding: 'Binah',
  mercy: 'Chesed',
  justice: 'Gevurah',
  beauty: 'Tiferet',
  victory: 'Netzach',
  glory: 'Hod',
  covenant: 'Yesod',
  kingdom: 'Malkhut',
  crown: 'Keter',
};

export function mapVerseToSefirot(verseText = '') {
  const normalized = String(verseText).toLowerCase();
  const matches = Object.entries(VERSE_KEYWORD_MAP)
    .filter(([keyword]) => normalized.includes(keyword))
    .map(([, sefirah]) => sefirah);

  return matches.length ? [...new Set(matches)] : ['Tiferet'];
}

export function mapGematriaToSefirot(gematria = 0) {
  const value = Number(gematria);
  if (!Number.isFinite(value) || value <= 0) return [];

  return [SEFIROT[value % SEFIROT.length]];
}

export function mapDivineNameToSefirot(name = '') {
  const sefirah = mapDivineNameToSefirah(name);
  return sefirah === 'Unknown' ? [] : [sefirah];
}

export function mapDivineNamesToSefirot(names = []) {
  if (!Array.isArray(names)) return [];

  return [...new Set(names.flatMap((name) => mapDivineNameToSefirot(name)))];
}

export function mapNumberToSefirot(number = 0) {
  const value = Number(number);
  if (!Number.isFinite(value) || value <= 0) return [];

  const mapped = [];
  const directIndex = value % SEFIROT.length;
  mapped.push(SEFIROT[directIndex]);

  if (value % 3 === 0) mapped.push('Binah');
  if (value % 7 === 0) mapped.push('Netzach');

  return [...new Set(mapped)];
}

export function mapPatternResultsToSefirot({ gematria, divineNames, sacredNumber } = {}) {
  const patternSefirot = [
    ...mapGematriaToSefirot(gematria),
    ...mapDivineNamesToSefirot(divineNames),
    ...mapNumberToSefirot(sacredNumber),
  ];

  return [...new Set(patternSefirot)];
}

export function createSefirotState() {
  return SEFIROT.reduce((state, sefirah) => {
    state[sefirah] = false;
    return state;
  }, {});
}
