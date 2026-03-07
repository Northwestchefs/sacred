#!/usr/bin/env node
const path = require('node:path');

const { PATHS, SUPPORTED_FILE_EXTENSIONS, FORMAT_ADAPTERS } = require('./config');
const { listFiles, readJsonIfExists } = require('./file-utils');
const { validateVerses } = require('./validate');
const { writeImportReport } = require('./writers');

function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    dryRun: !args.has('--write-report-only'),
    validateOnly: args.has('--validate-only'),
  };
}

function parseSourceFile(filePath) {
  const ext = getFileExtension(filePath);

  // TODO: Implement real format adapters.
  return {
    filePath,
    ext,
    adapter: FORMAT_ADAPTERS[ext] || 'unsupported',
    verses: [],
    notes: ['Scaffold parser only. No real verse extraction has been implemented yet.'],
  };
}

function main() {
  const options = parseArgs(process.argv);
  const manifest = readJsonIfExists(PATHS.manifestPath);
  const allFiles = listFiles(PATHS.rawDir);
  const supportedFiles = allFiles.filter((file) =>
    SUPPORTED_FILE_EXTENSIONS.includes(getFileExtension(file))
  );

  console.log('[hebrew-bible-importer] Starting scaffold importer...');
  console.log(`[hebrew-bible-importer] Raw directory: ${PATHS.rawDir}`);
  console.log(`[hebrew-bible-importer] Found ${allFiles.length} raw file(s), ${supportedFiles.length} supported.`);

  if (manifest) {
    console.log(`[hebrew-bible-importer] Loaded manifest: ${manifest.id || 'unknown-manifest-id'}`);
  } else {
    console.log('[hebrew-bible-importer] No manifest found. Continuing in scaffold mode.');
  }

  if (supportedFiles.length === 0) {
    console.error(
      `[hebrew-bible-importer] No supported source files found in ${PATHS.rawDir}. ` +
        `Supported extensions: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`
    );
    process.exitCode = 1;
    return;
  }

  const parsed = supportedFiles.map((filePath) => parseSourceFile(filePath));
  const combinedVerses = parsed.flatMap((entry) => entry.verses);
  const validation = validateVerses(combinedVerses);

  if (options.validateOnly) {
    if (validation.valid) {
      console.log('[hebrew-bible-importer] Validation passed.');
      return;
    }

    console.error('[hebrew-bible-importer] Validation failed:', validation.errors);
    process.exitCode = 1;
    return;
  }

  const report = {
    type: 'scaffold-import-report',
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    manifestId: manifest?.id || null,
    rawFilesFound: allFiles.map((filePath) => path.basename(filePath)),
    supportedFilesFound: supportedFiles.map((filePath) => path.basename(filePath)),
    parsedFiles: parsed.map((entry) => ({
      file: path.basename(entry.filePath),
      extension: entry.ext,
      adapter: entry.adapter,
      verseCount: entry.verses.length,
      notes: entry.notes,
    })),
    output: {
      processedDir: PATHS.processedDir,
      versesWritten: 0,
    },
    validation,
    notes: [
      'This is scaffold output only.',
      'No production parser is implemented yet.',
      'Source numbering preservation will be enforced by format adapters during real parsing.',
    ],
  };

  const reportPath = writeImportReport(PATHS.processedDir, report);
  console.log(`[hebrew-bible-importer] Wrote scaffold report: ${reportPath}`);
  console.log('[hebrew-bible-importer] Complete.');
}

main();
