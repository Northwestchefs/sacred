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
- `reference/hebrew-bible/processed/import-summary.json`
- `reference/hebrew-bible/processed/books/*.json` (per-book split)

## Validation checks

- required field presence (`id`, `source`, `book`, `chapter`, `verse`, `hebrew`)
- duplicate verse IDs
- missing chapter/verse values
- empty Hebrew text
- unresolved `bookHebrew`, `bookEnglish`, `canonicalOrder` are reported as warnings

If validation has errors, import exits non-zero and does not report success.

## Known limitations

- Only `.json` is supported currently.
- Optional enrichment fields (`transliteration`, `morphology`, `lemma`, `strongs`) are output as `null`.
- Book metadata resolution currently depends on recognized English book names/aliases.

## Adding future adapters

1. Add adapter module under `adapters/parse-<format>.js`.
2. Add extension handling in `readSourceByExtension()`.
3. Add routing in `routeAndParse()`.
4. Document assumptions and unsupported fields in `reference/hebrew-bible/import-pipeline.md`.
