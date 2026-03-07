# English Bible Reference Layer

This folder contains Sacred's English translation layer for the Hebrew Bible reader.

Current translation:
- **JPS 1917** (public domain)

## Layout

- `raw/`: importer input snapshots
- `processed/books.json`: book-level index
- `processed/books/*.json`: normalized chapter/verse records per book
- `processed/import-summary.json`: importer diagnostics and stats
- `source-manifest.json`: canonical source metadata

## Numbering policy

English source numbering is preserved exactly.

When references differ between Hebrew and English datasets, the reader reports mismatches explicitly instead of hiding them.
