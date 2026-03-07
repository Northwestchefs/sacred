# Hebrew Bible Importer Scaffold

This directory contains the **first scaffold** for importing Hebrew Bible source data into Sacred.

## Purpose

- Provide a modular importer foundation.
- Detect raw source files from `reference/hebrew-bible/raw/`.
- Load source metadata from `reference/hebrew-bible/source-manifest.json` when available.
- Define normalization and validation contracts for verse-level records.
- Write scaffold reports into `reference/hebrew-bible/processed/`.

> This scaffold does **not** yet implement a production parser for XML/JSON/TXT source datasets.

## Current Workflow

1. Run `node scripts/hebrew-bible/importer/index.js`.
2. The script checks `reference/hebrew-bible/raw/` for supported file types (`.json`, `.xml`, `.txt`).
3. If none are present, it exits with a clear error message.
4. If supported files are present, it routes each file to a placeholder adapter.
5. The scaffold writes `import-report.scaffold.json` to `reference/hebrew-bible/processed/`.

## Why Source Numbering Must Be Preserved

Hebrew/Jewish chapter/verse boundaries can differ from common English Christian numbering systems. The importer must preserve source numbering exactly and rely on separate mapping layers in the future instead of mutating source references.

## What Still Needs Implementation

- Real format adapters for source files (XML/JSON/TXT).
- Parser implementations that emit normalized verse objects.
- Token-level normalization options for morphology, lemma, and Strong’s layers.
- Mapping layer support for alternate verse numbering systems.
- End-to-end regression tests once a confirmed raw source file is added.

## CLI Examples

### Basic run

```bash
node scripts/hebrew-bible/importer/index.js
```

### Validation-only mode

```bash
node scripts/hebrew-bible/importer/index.js --validate-only
```

### Example scaffold output

```text
[hebrew-bible-importer] Starting scaffold importer...
[hebrew-bible-importer] Raw directory: /workspace/sacred/reference/hebrew-bible/raw
[hebrew-bible-importer] Found 1 raw file(s), 1 supported.
[hebrew-bible-importer] Loaded manifest: sacred.hebrew-bible.source-manifest.v1
[hebrew-bible-importer] Wrote scaffold report: /workspace/sacred/reference/hebrew-bible/processed/import-report.scaffold.json
[hebrew-bible-importer] Complete.
```
