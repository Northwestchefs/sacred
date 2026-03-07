const BOOKS = [
  ['Genesis', 'בראשית'],
  ['Exodus', 'שמות'],
  ['Leviticus', 'ויקרא'],
  ['Numbers', 'במדבר'],
  ['Deuteronomy', 'דברים'],
  ['Joshua', 'יהושע'],
  ['Judges', 'שופטים'],
  ['1 Samuel', 'שמואל א׳'],
  ['2 Samuel', 'שמואל ב׳'],
  ['1 Kings', 'מלכים א׳'],
  ['2 Kings', 'מלכים ב׳'],
  ['Isaiah', 'ישעיהו'],
  ['Jeremiah', 'ירמיהו'],
  ['Ezekiel', 'יחזקאל'],
  ['Hosea', 'הושע'],
  ['Joel', 'יואל'],
  ['Amos', 'עמוס'],
  ['Obadiah', 'עובדיה'],
  ['Jonah', 'יונה'],
  ['Micah', 'מיכה'],
  ['Nahum', 'נחום'],
  ['Habakkuk', 'חבקוק'],
  ['Zephaniah', 'צפניה'],
  ['Haggai', 'חגי'],
  ['Zechariah', 'זכריה'],
  ['Malachi', 'מלאכי'],
  ['Psalms', 'תהילים'],
  ['Proverbs', 'משלי'],
  ['Job', 'איוב'],
  ['Song of Songs', 'שיר השירים'],
  ['Ruth', 'רות'],
  ['Lamentations', 'איכה'],
  ['Ecclesiastes', 'קהלת'],
  ['Esther', 'אסתר'],
  ['Daniel', 'דניאל'],
  ['Ezra', 'עזרא'],
  ['Nehemiah', 'נחמיה'],
  ['1 Chronicles', 'דברי הימים א׳'],
  ['2 Chronicles', 'דברי הימים ב׳']
];

const aliases = new Map([
  ['Gen', 'Genesis'],
  ['Exod', 'Exodus'],
  ['Lev', 'Leviticus'],
  ['Num', 'Numbers'],
  ['Deut', 'Deuteronomy'],
  ['Ps', 'Psalms'],
  ['Psalm', 'Psalms'],
  ['Canticles', 'Song of Songs'],
  ['Song', 'Song of Songs']
]);

const metadataByKey = new Map();
BOOKS.forEach(([bookEnglish, bookHebrew], idx) => {
  const canonicalOrder = idx + 1;
  const record = { bookEnglish, bookHebrew, canonicalOrder, book: bookEnglish };
  metadataByKey.set(bookEnglish.toLowerCase(), record);
});

function resolveBookMetadata(rawBookName) {
  if (!rawBookName || typeof rawBookName !== 'string') {
    return null;
  }

  const normalized = rawBookName.trim();
  const alias = aliases.get(normalized) || normalized;
  return metadataByKey.get(alias.toLowerCase()) || null;
}

module.exports = {
  resolveBookMetadata
};
