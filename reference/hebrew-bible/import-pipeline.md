# Hebrew Bible Import Pipeline

## Current supported source

- Raw input location: `reference/hebrew-bible/raw/`
- Active parser implementation: `scripts/hebrew-bible/importer/adapters/parse-json.js`
- Current supported raw format: **JSON** (`.json`)

The importer automatically detects the single non-hidden file in `raw/` and routes based on file extension.

## Adapter behavior

Adapter: `parse-json.js`

Supported JSON shapes:
1. `[{ ...verse... }]`
2. `{ "verses": [{ ...verse... }] }`
3. `{ "books": [{ "chapters": [{ "verses": [{ ...verse... }] }] }] }`

For all supported shapes, the adapter:
- preserves source traversal order,
- preserves source chapter and verse numbering,
- does not remap Hebrew numbering into English numbering,
- carries through optional source fields (`transliteration`, `morphology`, `lemma`, `strongs`) when present,
- stores unmodeled source fields in `sourceExtras` for traceability.

## Normalized verse schema used by importer

```json
{
  "id": "genesis-1-1",
  "source": "OSHB/WLC",
  "book": "Genesis",
  "bookHebrew": "בראשית",
  "bookEnglish": "Genesis",
  "canonicalOrder": 1,
  "bookSlug": "genesis",
  "chapter": 1,
  "verse": 1,
  "hebrew": "בְּרֵאשִׁית ...",
  "text": "בְּרֵאשִׁית ...",
  "transliteration": null,
  "morphology": null,
  "lemma": null,
  "strongs": null,
  "notes": [],
  "sourceExtras": {}
}
```

## Validation

Importer fails hard on malformed or incomplete imports and reports diagnostics for:

- required field presence (`id`, `source`, `book`, `chapter`, `verse`, `hebrew`),
- duplicate verse IDs,
- missing or invalid chapter/verse references,
- empty Hebrew verse text,
- malformed records,
- unresolved `bookHebrew` / `bookEnglish` / `canonicalOrder` (warnings).

## Outputs

On successful import:

- `reference/hebrew-bible/processed/verses.json` (master verse list)
- `reference/hebrew-bible/processed/books.json` (book index)
- `reference/hebrew-bible/processed/books/<book-slug>.json` (per-book payload with chapter grouping)
- `reference/hebrew-bible/processed/import-summary.json` (totals + diagnostics)

Per-book files contain book metadata and chapter-grouped verses to support static-site lazy loading.

## Notes

- Import currently supports only JSON source files.
- Input must be exactly one active non-hidden file in `raw/`.
- Unknown book names are preserved, with canonical metadata warnings.
