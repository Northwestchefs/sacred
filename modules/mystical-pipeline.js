import { getVerse } from './verse-fetcher.js';
import { analyzeGematria } from './gematria-engine.js';
import { detectDivineNames } from './divine-name-analyzer.js';
import { mapToSefirot } from './sefirot-mapper.js';
import { fetchCommentary } from './commentary-fetcher.js';

export async function analyzeVerse(reference) {
  const verse = await getVerse(reference);
  const gematria = analyzeGematria(verse.hebrew);
  const divineNames = detectDivineNames(verse.hebrew);
  const sefirot = mapToSefirot(divineNames, gematria);
  const commentary = await fetchCommentary(reference);

  return {
    verse,
    gematria,
    divineNames,
    sefirot,
    commentary,
  };
}
