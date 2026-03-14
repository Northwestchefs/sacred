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

export function mapDivineNameToSefirot(name = '') {
  const sefirah = mapDivineNameToSefirah(name);
  return sefirah === 'Unknown' ? [] : [sefirah];
}

export function createSefirotState() {
  return SEFIROT.reduce((state, sefirah) => {
    state[sefirah] = false;
    return state;
  }, {});
}
