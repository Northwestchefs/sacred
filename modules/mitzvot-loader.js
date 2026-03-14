const LOCAL_STORAGE_KEY = 'sacred.mitzvot.cache.v8';
const MIN_EXPECTED_MITZVOT = 550;
let mitzvotCache = null;

export async function loadMitzvot() {
  if (Array.isArray(mitzvotCache)) return mitzvotCache;

  const cachedJson = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      if (Array.isArray(parsed) && parsed.length >= MIN_EXPECTED_MITZVOT) {
        mitzvotCache = parsed;
        return mitzvotCache;
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  const dataUrl = new URL('../data/mitzvot.json', import.meta.url);
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Unable to load mitzvot data.');

  const mitzvot = await response.json();
  mitzvotCache = Array.isArray(mitzvot) ? mitzvot : [];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mitzvotCache));
  } catch {
    // Storage may be unavailable; ignore gracefully.
  }

  return mitzvotCache;
}
