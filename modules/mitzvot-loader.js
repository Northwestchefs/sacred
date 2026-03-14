const LOCAL_STORAGE_KEY = 'sacred.mitzvot.cache.v9';
const MIN_EXPECTED_MITZVOT = 550;
const REQUIRED_MITZVAH_IDS = [1, 600, 613];
let mitzvotCache = null;

function isValidMitzvotDataset(value) {
  if (!Array.isArray(value) || value.length < MIN_EXPECTED_MITZVOT) {
    return false;
  }

  const ids = new Set(value.map((entry) => Number(entry?.id)));
  return REQUIRED_MITZVAH_IDS.every((id) => ids.has(id));
}

export async function loadMitzvot() {
  if (Array.isArray(mitzvotCache)) return mitzvotCache;

  const cachedJson = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      if (isValidMitzvotDataset(parsed)) {
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
  mitzvotCache = isValidMitzvotDataset(mitzvot) ? mitzvot : [];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mitzvotCache));
  } catch {
    // Storage may be unavailable; ignore gracefully.
  }

  return mitzvotCache;
}
