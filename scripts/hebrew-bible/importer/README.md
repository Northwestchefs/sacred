# Hebrew Bible Importer

This importer reads one raw Hebrew Bible source file from `reference/hebrew-bible/raw/`, routes to a format adapter, normalizes verses, validates output, and writes processed files.

## Supported format

- **JSON** (`.json`) via `adapters/parse-json.js`
- Supported JSON structures:
  1. Top-level array of verse objects
  2. Object with a `verses` array
  3. Object with nested `books[].chapters[].verses[]`

If the source JSON does not match one of these structures, the importer fails with a clear error.

## Run importer

```bash
node scripts/hebrew-bible/importer/index.js
```

### Dry run

```bash
node scripts/hebrew-bible/importer/index.js --dry-run
```

## Expected outputs

When validation passes:

- `reference/hebrew-bible/processed/verses.json`
- `reference/hebrew-bible/processed/books.json`
- `reference/hebrew-bible/processed/books/*.json`
- `reference/hebrew-bible/processed/import-summary.json`

## Validation checks

- required field presence (`id`, `source`, `book`, `chapter`, `verse`, `hebrew`)
- duplicate verse IDs
- missing or invalid chapter/verse references
- empty Hebrew verse text
- malformed record detection
- unresolved `bookHebrew`, `bookEnglish`, `canonicalOrder` are reported as warnings

If validation has errors, import exits non-zero and does not report success.

## Reporting

`import-summary.json` includes:

- total books/chapters/verses parsed
- duplicate and malformed record counts
- missing/empty verse diagnostics
- warning and error lists
- source and adapter metadata

## Known limitations

- Only `.json` is supported currently.
- Book metadata resolution depends on recognized English book names/aliases.
- Import expects exactly one active source file in `reference/hebrew-bible/raw/`.
