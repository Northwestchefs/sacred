const FINAL_LETTER_MAP = {
  ך: 'כ',
  ם: 'מ',
  ן: 'נ',
  ף: 'פ',
  ץ: 'צ',
};

const STANDARD_VALUES = {
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

const ORDINAL_VALUES = {
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
  כ: 11,
  ך: 11,
  ל: 12,
  מ: 13,
  ם: 13,
  נ: 14,
  ן: 14,
  ס: 15,
  ע: 16,
  פ: 17,
  ף: 17,
  צ: 18,
  ץ: 18,
  ק: 19,
  ר: 20,
  ש: 21,
  ת: 22,
};

const LETTER_VALUES = STANDARD_VALUES;

const FINAL_VALUES = {
  ך: 500,
  ם: 600,
  ן: 700,
  ף: 800,
  ץ: 900,
};

const GEMATRIA_SYSTEMS = {
  standard: STANDARD_VALUES,
  ordinal: ORDINAL_VALUES,
};

const HEBREW_MARKS_REGEX = /[\u0591-\u05BD\u05BF-\u05C7]/g;
const HEBREW_LETTER_REGEX = /[\u05D0-\u05EA]/;

function sumDigits(value = 0) {
  const absolute = Math.abs(Number(value) || 0);
  if (absolute < 10) return absolute;

  return String(absolute)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function normalizeLetter(letter = '') {
  return FINAL_LETTER_MAP[letter] || letter;
}

function sanitizeHebrewText(text = '') {
  return String(text).replace(HEBREW_MARKS_REGEX, '');
}

function breakdownBySystem(text = '', system = 'standard') {
  const values = GEMATRIA_SYSTEMS[system] || GEMATRIA_SYSTEMS.standard;

  return [...sanitizeHebrewText(text)]
    .filter((letter) => HEBREW_LETTER_REGEX.test(letter))
    .map((letter) => {
      const normalizedLetter = normalizeLetter(letter);
      const value = values[normalizedLetter] ?? values[letter] ?? 0;
      const standardValue = STANDARD_VALUES[normalizedLetter] ?? STANDARD_VALUES[letter] ?? 0;
      return {
        letter,
        normalizedLetter,
        value,
        finalValue: FINAL_VALUES[letter] ?? standardValue,
      };
    })
    .filter((entry) => entry.value > 0);
}

function calculateBySystem(text = '', system = 'standard') {
  return breakdownBySystem(text, system).reduce((sum, row) => sum + row.value, 0);
}

export function breakdownByLetter(text = '', system = 'standard') {
  return breakdownBySystem(text, system);
}

export function calculateGematria(text = '') {
  return calculateBySystem(text, 'standard');
}

export function calculateStandardGematria(text = '') {
  return calculateBySystem(text, 'standard');
}

export function calculateOrdinalGematria(text = '') {
  return calculateBySystem(text, 'ordinal');
}

export function calculateMisparKatan(text = '') {
  return breakdownBySystem(text, 'standard').reduce((sum, row) => sum + sumDigits(row.value), 0);
}

export function calculateMisparGadol(text = '') {
  return breakdownBySystem(text, 'standard').reduce((sum, row) => sum + row.finalValue, 0);
}

export function analyzeGematria(text = '') {
  return {
    total: calculateGematria(text),
    breakdown: breakdownBySystem(text, 'standard').map(({ letter, value }) => ({ letter, value })),
    reduced: calculateMisparKatan(text),
    finalLetterSystem: calculateMisparGadol(text),
  };
}

export { FINAL_VALUES, GEMATRIA_SYSTEMS, LETTER_VALUES, ORDINAL_VALUES, STANDARD_VALUES };
