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
- emits verse-level objects,
- preserves source chapter and verse numbering,
- does not synthesize morphology/lemma/Strong's data.

## Normalized verse schema used by importer

```json
{
  "id": "genesis-1-1",
  "source": "OSHB/WLC",
  "book": "Genesis",
  "bookHebrew": "בראשית",
  "bookEnglish": "Genesis",
  "canonicalOrder": 1,
  "chapter": 1,
  "verse": 1,
  "hebrew": "בְּרֵאשִׁית ...",
  "transliteration": null,
  "morphology": null,
  "lemma": null,
  "strongs": null,
  "notes": []
}
```

## Manifest integration

- The importer reads `reference/hebrew-bible/source-manifest.json`.
- `source.shortName` is used as the normalized `source` field when available.
- If `source.shortName` is missing, importer falls back to the raw filename stem.

## Validation

Importer validates:
- required fields (`id`, `source`, `book`, `chapter`, `verse`, `hebrew`),
- duplicate IDs,
- missing chapter/verse,
- empty Hebrew text.

Warnings are emitted for unresolved:
- `bookHebrew`,
- `bookEnglish`,
- `canonicalOrder`.

Any validation errors fail the import.

## Outputs

On successful import:
- `reference/hebrew-bible/processed/verses.json`
- `reference/hebrew-bible/processed/import-summary.json`
- `reference/hebrew-bible/processed/books/*.json`

`import-summary.json` includes source metadata, adapter details, counts, per-book totals, and warnings.

## Assumptions and limitations

- Import currently supports only JSON source files.
- Input must be exactly one active non-hidden file in `raw/`.
- Book metadata is resolved from recognized canonical English names/aliases.
- Unknown book names are retained in output but canonical metadata fields may remain `null` and are reported.
