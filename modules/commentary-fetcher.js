const API_ROOT = 'https://www.sefaria.org/api/links';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CLASSICAL_COMMENTATORS = ['Rashi', 'Ramban', 'Ibn Ezra', 'Midrash Rabbah', 'Zohar'];

function getCachedValue(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached?.timestamp || Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function setCachedValue(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // ignore localStorage write failures
  }
}

function extractCommentaryText(link = {}) {
  const en = link?.anchorVerse?.en || link?.text?.en || link?.en || link?.anchorVerse;
  if (Array.isArray(en)) return en.flat(Infinity).filter(Boolean).join(' ');
  return String(en || '').trim();
}

function resolveCommentator(link = {}) {
  const source = [link?.collectiveTitle?.en, link?.index_title, link?.ref, link?.sourceRef]
    .filter(Boolean)
    .join(' ');

  return CLASSICAL_COMMENTATORS.find((name) => source.includes(name));
}

export async function fetchCommentary(reference = '') {
  const ref = String(reference || '').trim();
  if (!ref) throw new Error('A verse reference is required.');

  const cacheKey = `commentary:${ref}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_ROOT}/${encodeURIComponent(ref)}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch commentary links (${response.status}).`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : [])
    .map((link) => {
      const commentator = resolveCommentator(link);
      if (!commentator) return null;

      const sourceRef = link?.ref || link?.sourceRef || link?.anchorRef || 'Unknown source';
      return {
        commentator,
        text: extractCommentaryText(link) || 'Commentary excerpt unavailable from API response.',
        sourceRef,
        url: `https://www.sefaria.org/${encodeURIComponent(String(sourceRef).replace(/\s+/g, '_'))}`,
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  setCachedValue(cacheKey, items);
  return items;
}

export { CLASSICAL_COMMENTATORS };
