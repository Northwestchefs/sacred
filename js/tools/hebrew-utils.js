const LETTER_VALUES = {
  א: 1,
  ב: 2,
  ג: 3,
  ד: 4,
  ה: 5,
  ו: 6,
  ז: 7,
  ח: 8,
  ט: 9,
  י: 10,
  כ: 20,
  ך: 20,
  ל: 30,
  מ: 40,
  ם: 40,
  נ: 50,
  ן: 50,
  ס: 60,
  ע: 70,
  פ: 80,
  ף: 80,
  צ: 90,
  ץ: 90,
  ק: 100,
  ר: 200,
  ש: 300,
  ת: 400,
};

const HEBREW_LETTERS = Object.freeze([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל',
  'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת',
]);

const SEFIROT = Object.freeze([
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
]);

const DIVINE_NAMES = Object.freeze(['יהוה', 'אדני', 'אלוהים', 'אל', 'שדי', 'צבאות']);

function stripHebrewMarks(text) {
  return String(text || '').replace(/[\u0591-\u05C7]/g, '');
}

function normalizeHebrewText(text) {
  return stripHebrewMarks(text).replace(/[^\u05D0-\u05EA\s]/g, '');
}

function gematria(text) {
  return normalizeHebrewText(text)
    .split('')
    .reduce((sum, char) => sum + (LETTER_VALUES[char] || 0), 0);
}

function mapValueToSefirah(value) {
  const index = Math.abs(Number(value) || 0) % SEFIROT.length;
  return SEFIROT[index];
}

export {
  LETTER_VALUES,
  HEBREW_LETTERS,
  SEFIROT,
  DIVINE_NAMES,
  stripHebrewMarks,
  normalizeHebrewText,
  gematria,
  mapValueToSefirah,
};
