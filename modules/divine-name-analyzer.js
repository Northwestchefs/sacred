import { calculateGematria } from './gematria-engine.js';

const DIVINE_NAMES = ['יהוה', 'אהיה', 'אל', 'אלוהים', 'שדי', 'אדני', 'צבאות'];

function normalizeHebrew(text = '') {
  return String(text)
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(text = '', token = '') {
  if (!text || !token) return 0;
  const pattern = new RegExp(token, 'g');
  return (text.match(pattern) || []).length;
}

function generatePermutations(name = '') {
  const letters = [...name];
  if (letters.length > 5) return [name];
  if (letters.length <= 1) return [name];

  const permutations = new Set();
  const recurse = (remaining, built = '') => {
    if (!remaining.length) {
      permutations.add(built);
      return;
    }

    remaining.forEach((char, index) => {
      recurse([...remaining.slice(0, index), ...remaining.slice(index + 1)], `${built}${char}`);
    });
  };

  recurse(letters);
  return [...permutations].slice(0, 24);
}

export function detectDivineNames(text = '') {
  const normalized = normalizeHebrew(text);
  const namesDetected = DIVINE_NAMES.filter((name) => normalized.includes(name));
  const nameFrequency = Object.fromEntries(namesDetected.map((name) => [name, countOccurrences(normalized, name)]));
  const gematriaValues = namesDetected.map((name) => ({
    name,
    value: calculateGematria(name),
  }));
  const nameGematria = Object.fromEntries(gematriaValues.map((row) => [row.name, row.value]));

  return {
    namesDetected,
    gematriaValues,
    permutations: namesDetected.flatMap((name) => generatePermutations(name).map((item) => ({ name, value: item }))),
    nameGematria,
    nameFrequency,
  };
}

export { DIVINE_NAMES };
