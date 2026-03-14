import { calculateGematria } from './gematria.js';

const DIVINE_NAME_SEFIROT = {
  יהוה: 'Tiferet',
  אלהים: 'Binah',
  אל: 'Chesed',
  שדי: 'Yesod',
  אדני: 'Malkhut',
  אהיה: 'Keter',
};

function permute(chars) {
  if (chars.length <= 1) return [chars.join('')];
  const permutations = new Set();

  chars.forEach((char, index) => {
    const remainder = [...chars.slice(0, index), ...chars.slice(index + 1)];
    permute(remainder).forEach((tail) => permutations.add(`${char}${tail}`));
  });

  return [...permutations];
}

export function computeDivineNameGematria(name = '') {
  return calculateGematria(name);
}

export function generatePermutations(name = '', maxResults = 120) {
  const letters = [...String(name).trim()];
  if (!letters.length) return [];

  const permutations = permute(letters);
  return permutations.slice(0, maxResults);
}

export function mapDivineNameToSefirah(name = '') {
  return DIVINE_NAME_SEFIROT[String(name).trim()] ?? 'Unknown';
}

export function analyzeDivineName(name = '') {
  return {
    name,
    gematria: computeDivineNameGematria(name),
    sefirah: mapDivineNameToSefirah(name),
    permutations: generatePermutations(name),
  };
}

export { DIVINE_NAME_SEFIROT };
