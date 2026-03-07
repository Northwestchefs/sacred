const DEFAULT_VERSES_PATH = 'reference/hebrew-bible/processed/verses.json';

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeParseInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function dedupe(values) {
  return [...new Set(values)];
}

function joinBasePath(basePath, relativePath) {
  if (!basePath) {
    return relativePath;
  }

  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${cleanBase}/${relativePath.replace(/^\//, '')}`;
}

function sortByCanonicalOrderThenLabel(items) {
  return [...items].sort((a, b) => {
    const aOrder = safeParseInteger(a.canonicalOrder);
    const bOrder = safeParseInteger(b.canonicalOrder);

    if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    if (aOrder !== null && bOrder === null) {
      return -1;
    }

    if (aOrder === null && bOrder !== null) {
      return 1;
    }

    return String(a.bookEnglish || a.book || '').localeCompare(String(b.bookEnglish || b.book || ''));
  });
}

export {
  DEFAULT_VERSES_PATH,
  dedupe,
  joinBasePath,
  normalizeSlug,
  safeParseInteger,
  sortByCanonicalOrderThenLabel,
};
