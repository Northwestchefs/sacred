import { buildGematriaDataset, getLoadedGematriaDataset } from './tanakh-gematria-map.js';

export const SACRED_NUMBERS = [7, 12, 26, 42, 72, 144];

export async function findVersesByNumber(number, book) {
  const target = Number(number);
  if (!Number.isFinite(target) || target < 0) {
    throw new Error('Sacred number must be a non-negative number.');
  }

  if (book) {
    const dataset = await buildGematriaDataset(book);
    return dataset.filter((row) => row.gematria === target).map((row) => ({
      verse: row.ref,
      gematria: row.gematria,
      text: row.text,
    }));
  }

  return getLoadedGematriaDataset()
    .filter((row) => row.gematria === target)
    .map((row) => ({
      verse: row.ref,
      gematria: row.gematria,
      text: row.text,
    }));
}
