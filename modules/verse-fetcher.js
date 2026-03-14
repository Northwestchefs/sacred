const API_ROOT = 'https://www.sefaria.org/api/texts';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function flattenText(text) {
  if (Array.isArray(text)) {
    return text.flat(Infinity).filter(Boolean).join(' ');
  }

  return String(text || '').trim();
}

function decodeHtmlEntities(text = '') {
  const value = String(text || '');
  if (!value) return '';

  if (typeof document !== 'undefined') {
    const parser = document.createElement('textarea');
    parser.innerHTML = value;
    return parser.value;
  }

  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(text = '') {
  return String(text || '').replace(/<[^>]+>/g, ' ');
}

function normalizeHebrewVerseText(text) {
  const flattened = flattenText(text);
  return decodeHtmlEntities(stripHtml(flattened)).replace(/\s+/g, ' ').trim();
}

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
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch {
    // no-op when storage is unavailable
  }
}

function parseReference(reference = '', payload = {}) {
  const fallback = String(reference).trim();
  const normalizedRef = payload?.ref || fallback;
  const [bookAndChapter = '', versePart] = normalizedRef.split(':');
  const segments = bookAndChapter.trim().split(/\s+/);
  const chapter = Number(segments.at(-1));
  const book = segments.slice(0, -1).join(' ') || payload?.book || fallback;
  const verse = Number(versePart || payload?.sections?.[1] || payload?.toSections?.[1] || 0);

  return {
    book,
    chapter: Number.isFinite(chapter) ? chapter : Number(payload?.sections?.[0] || 0),
    verse: Number.isFinite(verse) ? verse : 0,
  };
}

export async function getVerse(reference) {
  const ref = String(reference || '').trim();
  if (!ref) throw new Error('A verse reference is required.');

  const cacheKey = `verse:${ref}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const url = `${API_ROOT}/${encodeURIComponent(ref)}?context=0`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch verse (${response.status})`);
  }

  const payload = await response.json();
  const parsedRef = parseReference(ref, payload);
  const verseData = {
    reference: payload?.ref || ref,
    hebrew: normalizeHebrewVerseText(payload?.he || payload?.hebrew),
    english: flattenText(payload?.text || payload?.en),
    ...parsedRef,
  };

  setCachedValue(cacheKey, verseData);
  return verseData;
}
