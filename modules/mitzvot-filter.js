let sourceMitzvot = [];

export function setMitzvotCollection(items = []) {
  sourceMitzvot = Array.isArray(items) ? items : [];
}

export function filterByCategory(category) {
  if (!category || category === 'All') return [...sourceMitzvot];
  return sourceMitzvot.filter((mitzvah) => mitzvah.category === category);
}

export function filterByType(type) {
  if (!type || type === 'All') return [...sourceMitzvot];
  return sourceMitzvot.filter((mitzvah) => mitzvah.type === type);
}

export function searchMitzvot(keyword) {
  const normalized = (keyword || '').trim().toLowerCase();
  if (!normalized) return [...sourceMitzvot];

  return sourceMitzvot.filter((mitzvah) => {
    const searchable = [
      mitzvah.title,
      mitzvah.hebrew,
      mitzvah.category,
      mitzvah.type,
      mitzvah.torahSource,
      mitzvah.description,
      mitzvah.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalized);
  });
}

export function getMitzvahByNumber(number) {
  const parsed = Number.parseInt(number, 10);
  if (!Number.isInteger(parsed)) return null;
  return sourceMitzvot.find((mitzvah) => mitzvah.id === parsed) || null;
}
