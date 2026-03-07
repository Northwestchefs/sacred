#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseJsonSource } = require('./adapters/parse-json');
const { resolveBookMetadata } = require('./lib/book-metadata');

const repoRoot = path.resolve(__dirname, '../../..');
const sourceDir = path.join(repoRoot, 'reference/hebrew-bible/raw');
const processedDir = path.join(repoRoot, 'reference/hebrew-bible/processed');
const manifestPath = path.join(repoRoot, 'reference/hebrew-bible/source-manifest.json');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Hebrew Bible importer starting${dryRun ? ' (dry-run)' : ''}...`);

  const manifest = await readManifest(manifestPath);
  const sourceFile = await detectSingleSourceFile(sourceDir);
  const sourceExt = path.extname(sourceFile).toLowerCase();

  console.log(`Source file detected: ${path.relative(repoRoot, sourceFile)}`);
  console.log(`Source format selected: ${sourceExt || 'unknown'}`);

  const sourceId = deriveSourceId(manifest, sourceFile);
  const sourcePayload = await readSourceByExtension(sourceFile, sourceExt);

  const { verses: parsedVerses, warnings: adapterWarnings, detectedStructure } = routeAndParse({
    sourceExt,
    sourcePayload,
    sourceId
  });

  const verses = addComputedFields(parsedVerses);
  const validation = validateVerses(verses);

  const allWarnings = [...adapterWarnings, ...validation.warnings];

  console.log(`Adapter structure detected: ${detectedStructure}`);
  console.log(`Verses parsed: ${verses.length}`);

  for (const warning of allWarnings) {
    console.warn(`WARN: ${warning}`);
  }

  for (const err of validation.errors) {
    console.error(`ERROR: ${err}`);
  }

  if (validation.errors.length > 0) {
    throw new Error(`Validation failed with ${validation.errors.length} error(s).`);
  }

  const books = buildBooksPayload(verses);
  const booksIndex = books.map((book) => ({
    slug: book.slug,
    book: book.book,
    bookEnglish: book.bookEnglish,
    bookHebrew: book.bookHebrew,
    canonicalOrder: book.canonicalOrder,
    chapterCount: book.chapterCount,
    verseCount: book.verseCount,
    file: `books/${book.slug}.json`
  }));

  const summary = {
    sourceFile: path.relative(repoRoot, sourceFile),
    sourceFormat: sourceExt,
    sourceId,
    adapter: 'parse-json',
    detectedStructure,
    totals: {
      books: books.length,
      chapters: validation.chapterCount,
      verses: verses.length
    },
    warnings: allWarnings,
    errors: validation.errors,
    diagnostics: {
      emptyVerseTextCount: validation.emptyVerseTextCount,
      duplicateIdCount: validation.duplicateIdCount,
      malformedRecordCount: validation.malformedRecordCount,
      missingOrInvalidReferenceCount: validation.missingOrInvalidReferenceCount
    },
    byBook: Object.fromEntries(books.map((book) => [book.bookEnglish || book.book || book.slug, book.verseCount])),
    generatedAt: new Date().toISOString(),
    dryRun
  };

  if (!dryRun) {
    await writeProcessedOutput({
      outDir: processedDir,
      verses,
      books,
      booksIndex,
      summary
    });

    console.log('Output files written: verses.json, books.json, import-summary.json, books/*.json');
  } else {
    console.log('Dry-run enabled: no files written.');
  }

  console.log(`Import completed successfully (${books.length} books, ${validation.chapterCount} chapters, ${verses.length} verses).`);
}

async function readManifest(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function detectSingleSourceFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.'));

  if (files.length === 0) {
    throw new Error(
      `No raw source files found in ${path.relative(repoRoot, dirPath)}. Add exactly one supported source file before running importer.`
    );
  }

  if (files.length > 1) {
    throw new Error(
      `Multiple raw source files found (${files.join(', ')}). Keep one active import file at a time to avoid ambiguous adapter routing.`
    );
  }

  return path.join(dirPath, files[0]);
}

async function readSourceByExtension(filePath, ext) {
  if (ext === '.json') {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  throw new Error(`Unsupported source format "${ext}". Add an adapter for this format.`);
}

function routeAndParse({ sourceExt, sourcePayload, sourceId }) {
  if (sourceExt === '.json') {
    return parseJsonSource({ payload: sourcePayload, sourceId });
  }

  throw new Error(`No adapter available for ${sourceExt}.`);
}

function deriveSourceId(manifest, sourceFile) {
  if (manifest?.source?.shortName) {
    return String(manifest.source.shortName);
  }

  return path.basename(sourceFile, path.extname(sourceFile));
}

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addComputedFields(verses) {
  return verses.map((verse) => ({
    ...verse,
    bookSlug: normalizeSlug(verse.bookEnglish || verse.book || verse.bookHebrew),
    text: verse.hebrew
  }));
}

function validateVerses(verses) {
  const errors = [];
  const warnings = [];
  const seenIds = new Map();
  const uniqueChapterRefs = new Set();

  let malformedRecordCount = 0;
  let missingOrInvalidReferenceCount = 0;
  let emptyVerseTextCount = 0;
  let duplicateIdCount = 0;

  verses.forEach((verse, idx) => {
    const pointer = `verses[${idx}]`;

    if (!verse || typeof verse !== 'object') {
      malformedRecordCount += 1;
      errors.push(`${pointer}: record is not an object.`);
      return;
    }

    let hasMalformedField = false;

    if (!verse.id || typeof verse.id !== 'string') {
      hasMalformedField = true;
      errors.push(`${pointer}: missing id.`);
    }

    if (!verse.source || typeof verse.source !== 'string') {
      hasMalformedField = true;
      errors.push(`${pointer}: missing source.`);
    }

    if (!verse.book || typeof verse.book !== 'string') {
      hasMalformedField = true;
      errors.push(`${pointer}: missing book.`);
    }

    if (!Number.isInteger(verse.chapter) || verse.chapter <= 0) {
      missingOrInvalidReferenceCount += 1;
      hasMalformedField = true;
      errors.push(`${pointer}: missing or invalid chapter.`);
    }

    if (!Number.isInteger(verse.verse) || verse.verse <= 0) {
      missingOrInvalidReferenceCount += 1;
      hasMalformedField = true;
      errors.push(`${pointer}: missing or invalid verse.`);
    }

    if (!verse.hebrew || typeof verse.hebrew !== 'string' || !verse.hebrew.trim()) {
      emptyVerseTextCount += 1;
      hasMalformedField = true;
      errors.push(`${pointer}: empty Hebrew text.`);
    }

    if (verse.id) {
      if (seenIds.has(verse.id)) {
        duplicateIdCount += 1;
        hasMalformedField = true;
        errors.push(`${pointer}: duplicate id "${verse.id}" (first seen at verses[${seenIds.get(verse.id)}]).`);
      } else {
        seenIds.set(verse.id, idx);
      }
    }

    if (!verse.bookHebrew) {
      warnings.push(`${pointer}: bookHebrew unresolved.`);
    }

    if (!verse.bookEnglish) {
      warnings.push(`${pointer}: bookEnglish unresolved.`);
    }

    if (!Number.isInteger(verse.canonicalOrder)) {
      warnings.push(`${pointer}: canonicalOrder unresolved.`);
    }

    if (Number.isInteger(verse.chapter) && Number.isInteger(verse.verse) && verse.bookSlug) {
      uniqueChapterRefs.add(`${verse.bookSlug}:${verse.chapter}`);
    }

    if (hasMalformedField) {
      malformedRecordCount += 1;
    }
  });

  return {
    errors,
    warnings,
    chapterCount: uniqueChapterRefs.size,
    malformedRecordCount,
    missingOrInvalidReferenceCount,
    emptyVerseTextCount,
    duplicateIdCount
  };
}

function buildBooksPayload(verses) {
  const byBook = new Map();

  for (const verse of verses) {
    const slug = verse.bookSlug || normalizeSlug(verse.bookEnglish || verse.book || verse.bookHebrew || 'unknown');

    if (!byBook.has(slug)) {
      const metadata = resolveBookMetadata(verse.bookEnglish || verse.book);

      byBook.set(slug, {
        slug,
        book: metadata?.book || verse.book || null,
        bookEnglish: metadata?.bookEnglish || verse.bookEnglish || verse.book || null,
        bookHebrew: metadata?.bookHebrew || verse.bookHebrew || null,
        canonicalOrder: metadata?.canonicalOrder || verse.canonicalOrder || null,
        chapterCount: 0,
        verseCount: 0,
        chapters: {}
      });
    }

    const book = byBook.get(slug);
    const chapterKey = String(verse.chapter);

    if (!book.chapters[chapterKey]) {
      book.chapters[chapterKey] = [];
      book.chapterCount += 1;
    }

    book.chapters[chapterKey].push({ ...verse });
    book.verseCount += 1;
  }

  const books = [...byBook.values()]
    .map((book) => {
      const sortedChapterKeys = Object.keys(book.chapters)
        .map((value) => Number.parseInt(value, 10))
        .filter(Number.isInteger)
        .sort((a, b) => a - b);

      const normalizedChapters = {};
      sortedChapterKeys.forEach((chapter) => {
        normalizedChapters[String(chapter)] = book.chapters[String(chapter)]
          .sort((a, b) => a.verse - b.verse)
          .map((verse) => ({ ...verse }));
      });

      return {
        ...book,
        chapterCount: sortedChapterKeys.length,
        chapters: normalizedChapters
      };
    })
    .sort((a, b) => {
      const aOrder = Number.isInteger(a.canonicalOrder) ? a.canonicalOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isInteger(b.canonicalOrder) ? b.canonicalOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return String(a.bookEnglish || a.book || a.slug).localeCompare(String(b.bookEnglish || b.book || b.slug));
    });

  return books;
}

async function writeProcessedOutput({ outDir, verses, books, booksIndex, summary }) {
  const booksDir = path.join(outDir, 'books');
  await fs.mkdir(booksDir, { recursive: true });

  await fs.writeFile(path.join(outDir, 'verses.json'), `${JSON.stringify(verses, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'books.json'), `${JSON.stringify(booksIndex, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'import-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  const writes = books.map((book) =>
    fs.writeFile(path.join(booksDir, `${book.slug}.json`), `${JSON.stringify(book, null, 2)}\n`)
  );

  await Promise.all(writes);
}

main().catch((err) => {
  console.error(`Import failed: ${err.message}`);
  process.exitCode = 1;
});
