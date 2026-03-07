# English Bible Source Manifest (JPS 1917)

Canonical English translation layer for Sacred's Tanakh reader.

## Source

- Translation: **The Holy Scriptures: A New Translation (JPS 1917)**
- Status: Public domain (per JPS announcement)
- Scope for this import: **JPS 1917 only**

## Policy

- Preserve source chapter and verse numbering exactly.
- Normalize to Sacred reference keys:
  - `bookSlug`
  - `chapter`
  - `verse`
- Do not fabricate verses.
- Do not silently merge numbering mismatches.
- Report mismatches at read time and in importer summary artifacts.

## Storage

- Raw input: `reference/english-bible/raw/`
- Processed output: `reference/english-bible/processed/`
