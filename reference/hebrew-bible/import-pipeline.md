# Hebrew Bible Import Pipeline (Scaffold)

## Purpose

Define a clean importer foundation that can ingest Hebrew Bible raw source files and produce normalized verse-level JSON for Sacred.

## Pipeline Overview

1. Read importer configuration and paths.
2. Load source manifest metadata (if present).
3. Scan `raw/` for supported source files.
4. Route each file to a format adapter (currently placeholder adapters only).
5. Normalize parsed records into the verse contract.
6. Validate normalized verse objects.
7. Write outputs and reports to `processed/`.

## Input Location

- `reference/hebrew-bible/raw/`

## Output Location

- `reference/hebrew-bible/processed/`
- Scaffold output currently includes `import-report.scaffold.json`.

## Manifest Dependency

- Primary manifest: `reference/hebrew-bible/source-manifest.json`
- Manifest metadata is used for provenance context and import configuration.
- Importer must still run in scaffold mode if the manifest is temporarily unavailable.

## Normalization Goals

- Emit one object per source verse.
- Preserve source chapter and verse numbering exactly.
- Keep source provenance attached.
- Use UTF-8 for Hebrew text end-to-end.
- Keep optional enrichment layers (`morphology`, `lemma`, `strongs`) nullable until implemented.

## Validation Rules

Current scaffold validation checks:

- `source` is a non-empty string or object.
- `book` is a non-empty string.
- `chapter` is a positive integer.
- `verse` is a positive integer.
- `hebrew` is a non-empty string.

Validation returns structured errors for future CLI and CI integration.

## Future Parser Stages

- Stage 1: Implement first confirmed source adapter.
- Stage 2: Parse and normalize verse-level records.
- Stage 3: Add token-level parsing for morphology/lemma/Strong’s where available.
- Stage 4: Add regression tests pinned to a specific upstream release.
- Stage 5: Add separate verse-mapping layers for alternate numbering traditions.

## Verse Numbering Preservation

The importer must keep source numbering exactly as provided by the Hebrew source tradition. If alternate verse mappings are needed for other traditions, those mappings should be stored as separate metadata layers, not by rewriting source chapter/verse references.

## Potential Future Format Adapters

- XML adapter (`.xml`)
- JSON adapter (`.json`)
- Plain text adapter (`.txt`)

These adapters should share a normalization contract and validation layer, while keeping parser-specific logic isolated.
