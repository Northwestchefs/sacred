#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveBookMetadata } = require('../../hebrew-bible/importer/lib/book-metadata');

const repoRoot = path.resolve(__dirname, '../../..');
const sourceDir = path.join(repoRoot, 'reference/english-bible/raw');
const processedDir = path.join(repoRoot, 'reference/english-bible/processed');
const manifestPath = path.join(repoRoot, 'reference/english-bible/source-manifest.json');

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function detectSingleSourceFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name);

  if (!files.length) {
    throw new Error(`No raw source files found in ${path.relative(repoRoot, dirPath)}.`);
  }

  if (files.length > 1) {
    throw new Error(`Multiple raw source files found (${files.join(', ')}). Keep one active source file.`);
  }

  return path.join(dirPath, files[0]);
}

function parseSource(sourcePayload, sourceId) {
  const books = Array.isArray(sourcePayload?.books) ? sourcePayload.books : [];
  const verses = [];

  for (const bookPayload of books) {
    const bookName = bookPayload?.book;
    const metadata = resolveBookMetadata(bookName) || {};
    const bookEnglish = metadata.bookEnglish || bookName;
    const bookSlug = normalizeSlug(bookEnglish);

    for (const chapterPayload of bookPayload?.chapters || []) {
      const chapter = Number(chapterPayload?.chapter);
      for (const versePayload of chapterPayload?.verses || []) {
        const verse = Number(versePayload?.verse);
        const english = String(versePayload?.english || '').trim();

        verses.push({
          id: `${bookSlug}-${chapter}-${verse}`,
          source: sourceId,
          book: bookEnglish,
          bookEnglish,
          bookHebrew: metadata.bookHebrew || null,
          canonicalOrder: metadata.canonicalOrder || null,
          bookSlug,
          chapter,
          verse,
          english,
          text: english,
        });
      }
    }
  }

  return verses;
}

function validateVerses(verses) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  verses.forEach((verse, idx) => {
    const pointer = `verses[${idx}]`;

    if (!verse.id || typeof verse.id !== 'string') {
      errors.push(`${pointer}: missing id`);
    }

    if (seenIds.has(verse.id)) {
      errors.push(`${pointer}: duplicate id ${verse.id}`);
    }
    seenIds.add(verse.id);

    if (!Number.isInteger(verse.chapter) || verse.chapter <= 0) {
      errors.push(`${pointer}: invalid chapter`);
    }

    if (!Number.isInteger(verse.verse) || verse.verse <= 0) {
      errors.push(`${pointer}: invalid verse`);
    }

    if (!verse.english) {
      errors.push(`${pointer}: empty english text`);
    }

    if (!Number.isInteger(verse.canonicalOrder)) {
      warnings.push(`${pointer}: canonicalOrder unresolved`);
    }
  });

  return { errors, warnings };
}

function buildBooksPayload(verses) {
  const byBook = new Map();

  for (const verse of verses) {
    if (!byBook.has(verse.bookSlug)) {
      byBook.set(verse.bookSlug, {
        slug: verse.bookSlug,
        book: verse.bookEnglish,
        bookEnglish: verse.bookEnglish,
        bookHebrew: verse.bookHebrew,
        canonicalOrder: verse.canonicalOrder,
        verseCount: 0,
        chapters: {},
      });
    }

    const book = byBook.get(verse.bookSlug);
    const chapterKey = String(verse.chapter);
    if (!book.chapters[chapterKey]) {
      book.chapters[chapterKey] = [];
    }

    book.chapters[chapterKey].push({ ...verse });
    book.verseCount += 1;
  }

  return [...byBook.values()]
    .map((book) => {
      const chapterKeys = Object.keys(book.chapters).map(Number).sort((a, b) => a - b);
      const normalizedChapters = {};

      chapterKeys.forEach((chapter) => {
        normalizedChapters[String(chapter)] = book.chapters[String(chapter)]
          .sort((a, b) => a.verse - b.verse)
          .map((verse) => ({ ...verse }));
      });

      return {
        ...book,
        chapterCount: chapterKeys.length,
        chapters: normalizedChapters,
      };
    })
    .sort((a, b) => (a.canonicalOrder || 999) - (b.canonicalOrder || 999));
}

async function writeProcessedOutput({ verses, books, summary }) {
  const booksDir = path.join(processedDir, 'books');
  await fs.mkdir(booksDir, { recursive: true });

  const booksIndex = books.map((book) => ({
    slug: book.slug,
    book: book.book,
    bookEnglish: book.bookEnglish,
    bookHebrew: book.bookHebrew,
    canonicalOrder: book.canonicalOrder,
    chapterCount: book.chapterCount,
    verseCount: book.verseCount,
    file: `books/${book.slug}.json`,
  }));

  await fs.writeFile(path.join(processedDir, 'verses.json'), `${JSON.stringify(verses, null, 2)}\n`);
  await fs.writeFile(path.join(processedDir, 'books.json'), `${JSON.stringify(booksIndex, null, 2)}\n`);
  await fs.writeFile(path.join(processedDir, 'import-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  await Promise.all(
    books.map((book) => fs.writeFile(path.join(booksDir, `${book.slug}.json`), `${JSON.stringify(book, null, 2)}\n`))
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const sourceFile = await detectSingleSourceFile(sourceDir);
  const payload = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  const sourceId = manifest?.source?.shortName || 'JPS 1917';
  const verses = parseSource(payload, sourceId);
  const validation = validateVerses(verses);

  if (validation.errors.length) {
    throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
  }

  const books = buildBooksPayload(verses);

  const summary = {
    sourceFile: path.relative(repoRoot, sourceFile),
    sourceId,
    totals: {
      books: books.length,
      chapters: books.reduce((sum, book) => sum + book.chapterCount, 0),
      verses: verses.length,
    },
    warnings: validation.warnings,
    errors: validation.errors,
    numberingPolicy: 'Preserve source numbering; report mismatches at read time.',
    generatedAt: new Date().toISOString(),
    dryRun,
  };

  if (!dryRun) {
    await writeProcessedOutput({ verses, books, summary });
  }

  console.log(`English import complete (${books.length} books, ${verses.length} verses).`);
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exitCode = 1;
});
