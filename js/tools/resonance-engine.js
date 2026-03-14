import { calculateGematria } from '../gematria.js';
import { getText } from '../sefaria-api.js';

const SEARCH_ROOT = 'https://www.sefaria.org/api/search-wrapper';
const FALLBACK_REFS = ['Genesis 1:1', 'Exodus 3:14', 'Psalm 23:1', 'Psalm 91:1', 'Isaiah 40:31'];

function flattenText(text) {
  if (Array.isArray(text)) {
    return text.flat(Infinity).filter(Boolean).join(' ');
  }

  return String(text || '').trim();
}

function normalizeVersePayload(payload) {
  const hebrew = flattenText(payload?.versions?.[0]?.text?.he || payload?.he || payload?.hebrew);
  const english = flattenText(payload?.versions?.[0]?.text?.en || payload?.text || payload?.en);

  return {
    ref: payload?.ref || payload?.heRef || '',
    hebrew,
    english,
  };
}

async function getCandidateRefs(query = 'psalm', maxCandidates = 18) {
  try {
    const response = await fetch(
      `${SEARCH_ROOT}?q=${encodeURIComponent(query)}&type=text&size=${Math.max(1, maxCandidates)}`,
    );
    if (!response.ok) throw new Error(`Search failed with status ${response.status}`);

    const payload = await response.json();
    const hits = payload?.hits?.hits || payload?.hits || [];

    const refs = hits
      .map((hit) => hit?.ref || hit?._source?.ref || hit?.sourceRef)
      .filter(Boolean)
      .slice(0, maxCandidates);

    return refs.length ? refs : FALLBACK_REFS;
  } catch {
    return FALLBACK_REFS;
  }
}

export function calculatePhraseGematria(text = '') {
  return calculateGematria(String(text).trim());
}

export async function calculateVerseGematria(ref) {
  if (!ref) throw new Error('A verse reference is required.');

  const payload = await getText(ref);
  const verse = normalizeVersePayload(payload);
  const sourceText = verse.hebrew || verse.english;

  return {
    verse: verse.ref || ref,
    gematria: calculateGematria(sourceText),
    hebrew: verse.hebrew,
    english: verse.english,
  };
}

export async function findResonantVerses(value) {
  const target = Number(value);
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Resonance value must be a positive number.');
  }

  const candidates = await getCandidateRefs(String(target));
  const resolved = await Promise.all(
    candidates.map(async (ref) => {
      try {
        return await calculateVerseGematria(ref);
      } catch {
        return null;
      }
    }),
  );

  return resolved
    .filter(Boolean)
    .filter((entry) => entry.gematria === target)
    .map((entry) => ({
      verse: entry.verse,
      gematria: entry.gematria,
      hebrew: entry.hebrew,
      english: entry.english,
    }));
}
