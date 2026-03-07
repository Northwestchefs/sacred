#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseJsonSource } = require('./adapters/parse-json');

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

  const { verses, warnings, detectedStructure } = routeAndParse({
    sourceExt,
    sourcePayload,
    sourceId
  });

  console.log(`Adapter structure detected: ${detectedStructure}`);
  console.log(`Verses parsed: ${verses.length}`);

  const validation = validateVerses(verses);

  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
  for (const warning of validation.warnings) {
    console.warn(`WARN: ${warning}`);
  }
  for (const err of validation.errors) {
    console.error(`ERROR: ${err}`);
  }

  if (validation.errors.length > 0) {
    throw new Error(`Validation failed with ${validation.errors.length} error(s).`);
  }

  const byBookStats = getBookStats(verses);
  const summary = {
    sourceFile: path.relative(repoRoot, sourceFile),
    sourceFormat: sourceExt,
    sourceId,
    adapter: 'parse-json',
    detectedStructure,
    verseCount: verses.length,
    warnings: [...warnings, ...validation.warnings],
    errors: [],
    byBook: byBookStats,
    generatedAt: new Date().toISOString(),
    dryRun
  };

  if (!dryRun) {
    await fs.mkdir(processedDir, { recursive: true });
    await fs.writeFile(path.join(processedDir, 'verses.json'), `${JSON.stringify(verses, null, 2)}\n`);
    await fs.writeFile(
      path.join(processedDir, 'import-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`
    );

    await writePerBookFiles(verses, processedDir);
    console.log('Output files written: verses.json, import-summary.json, books/*.json');
  } else {
    console.log('Dry-run enabled: no files written.');
  }

  console.log('Import completed successfully.');
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

function validateVerses(verses) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  verses.forEach((verse, idx) => {
    const pointer = `verses[${idx}]`;
    if (!verse.id || typeof verse.id !== 'string') {
      errors.push(`${pointer}: missing id.`);
    }

    if (!verse.source || typeof verse.source !== 'string') {
      errors.push(`${pointer}: missing source.`);
    }

    if (!verse.book || typeof verse.book !== 'string') {
      errors.push(`${pointer}: missing book.`);
    }

    if (!Number.isInteger(verse.chapter)) {
      errors.push(`${pointer}: missing chapter.`);
    }

    if (!Number.isInteger(verse.verse)) {
      errors.push(`${pointer}: missing verse.`);
    }

    if (!verse.hebrew || typeof verse.hebrew !== 'string' || !verse.hebrew.trim()) {
      errors.push(`${pointer}: empty Hebrew text.`);
    }

    if (verse.id) {
      if (seenIds.has(verse.id)) {
        errors.push(`${pointer}: duplicate id "${verse.id}".`);
      }
      seenIds.add(verse.id);
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
  });

  return { errors, warnings };
}

function getBookStats(verses) {
  const stats = {};
  for (const verse of verses) {
    const key = verse.book || 'Unknown';
    stats[key] = (stats[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0])));
}

async function writePerBookFiles(verses, outDir) {
  const booksDir = path.join(outDir, 'books');
  await fs.mkdir(booksDir, { recursive: true });

  const byBook = new Map();
  for (const verse of verses) {
    const key = verse.book || 'Unknown';
    if (!byBook.has(key)) {
      byBook.set(key, []);
    }
    byBook.get(key).push(verse);
  }

  for (const [book, bookVerses] of byBook.entries()) {
    const slug = book.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
    const outFile = path.join(booksDir, `${slug}.json`);
    await fs.writeFile(outFile, `${JSON.stringify(bookVerses, null, 2)}\n`);
  }
}

main().catch((err) => {
  console.error(`Import failed: ${err.message}`);
  process.exitCode = 1;
});
