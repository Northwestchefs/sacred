import { calculateGematria } from '../gematria.js';
import { getText } from '../sefaria-api.js';
import { SEFIROT } from '../sefirot-map.js';

const EXODUS_REFS = ['Exodus 14:19', 'Exodus 14:20', 'Exodus 14:21'];

function flattenText(text) {
  if (Array.isArray(text)) {
    return text.flat(Infinity).filter(Boolean).join('');
  }

  return String(text || '');
}

function normalizeHebrewLetters(text = '') {
  return String(text)
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\u05D0-\u05EA]/g, '');
}

function toSefirah(index) {
  return SEFIROT[index % SEFIROT.length];
}

export async function generate72Names() {
  const verses = await Promise.all(EXODUS_REFS.map((ref) => getText(ref)));
  const [first, middle, last] = verses
    .map((payload) => flattenText(payload?.he || payload?.hebrew || payload?.versions?.[0]?.text?.he))
    .map((text) => normalizeHebrewLetters(text));

  const middleReversed = [...middle].reverse().join('');
  const width = Math.min(first.length, middleReversed.length, last.length, 72);

  return Array.from({ length: width }, (_, index) => {
    const name = `${first[index]}${middleReversed[index]}${last[index]}`;

    return {
      name,
      gematria: calculateGematria(name),
      sefirotAssociation: toSefirah(index),
    };
  });
}
