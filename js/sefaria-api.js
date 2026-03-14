const API_ROOT = 'https://www.sefaria.org/api';

async function fetchJson(path) {
  const response = await fetch(`${API_ROOT}${path}`);
  if (!response.ok) {
    throw new Error(`Sefaria API request failed (${response.status}) for ${path}`);
  }
  return response.json();
}

export function getText(ref) {
  if (!ref) throw new Error('A reference is required.');
  return fetchJson(`/v3/texts/${encodeURIComponent(ref)}`);
}

export function getLinks(ref) {
  if (!ref) throw new Error('A reference is required.');
  return fetchJson(`/links/${encodeURIComponent(ref)}`);
}

export function getTopics() {
  return fetchJson('/topics');
}
