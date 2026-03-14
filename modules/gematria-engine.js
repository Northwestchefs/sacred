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

const FINAL_VALUES = {
  ך: 500,
  ם: 600,
  ן: 700,
  ף: 800,
  ץ: 900,
};

function sumDigits(value = 0) {
  const absolute = Math.abs(Number(value) || 0);
  if (absolute < 10) return absolute;

  return String(absolute)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
}

export function breakdownByLetter(text = '') {
  return [...String(text)]
    .map((letter) => ({
      letter,
      value: LETTER_VALUES[letter] ?? 0,
      finalValue: FINAL_VALUES[letter] ?? LETTER_VALUES[letter] ?? 0,
    }))
    .filter((entry) => entry.value > 0);
}

export function calculateGematria(text = '') {
  return breakdownByLetter(text).reduce((sum, row) => sum + row.value, 0);
}

export function calculateMisparKatan(text = '') {
  return breakdownByLetter(text).reduce((sum, row) => sum + sumDigits(row.value), 0);
}

export function calculateMisparGadol(text = '') {
  return breakdownByLetter(text).reduce((sum, row) => sum + row.finalValue, 0);
}

export function analyzeGematria(text = '') {
  return {
    total: calculateGematria(text),
    breakdown: breakdownByLetter(text).map(({ letter, value }) => ({ letter, value })),
    reduced: calculateMisparKatan(text),
    finalLetterSystem: calculateMisparGadol(text),
  };
}

export { LETTER_VALUES, FINAL_VALUES };
