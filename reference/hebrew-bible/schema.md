# Recommended Internal Schema (Verse-Level)

This schema defines a practical, future-friendly verse record for Sacred. It is designed to preserve source fidelity while supporting optional enrichment layers.

## Fields

- `id` (string): stable unique identifier (example: `heb-bible.genesis.1.1`).
- `source` (object): source metadata for provenance and licensing.
  - `name` (string)
  - `version` (string)
  - `url` (string)
- `book` (string): canonical short book key (example: `GEN`).
- `bookHebrew` (string): Hebrew book name.
- `bookEnglish` (string): English book name.
- `canonicalOrder` (number): 1-based canonical order used by Sacred.
- `chapter` (number): chapter number from source.
- `verse` (number): verse number from source.
- `hebrew` (string): Hebrew verse text (UTF-8).
- `transliteration` (string, optional): transliterated text when available.
- `morphology` (array, optional): token-level morphology annotations.
- `lemma` (array, optional): token-level lemma annotations.
- `strongs` (array, optional): token-level Strong’s references.
- `notes` (array, optional): import or editorial notes.

## Example JSON Object

```json
{
  "id": "heb-bible.genesis.1.1",
  "source": {
    "name": "Open Scriptures Hebrew Bible / WLC",
    "version": "to-be-confirmed",
    "url": "to-be-confirmed"
  },
  "book": "GEN",
  "bookHebrew": "בראשית",
  "bookEnglish": "Genesis",
  "canonicalOrder": 1,
  "chapter": 1,
  "verse": 1,
  "hebrew": "בְּרֵאשִׁית בָּרָא אֱלֹהִים",
  "transliteration": null,
  "morphology": [],
  "lemma": [],
  "strongs": [],
  "notes": [
    "Source numbering preserved"
  ]
}
```

## Implementation Notes

- Store text using UTF-8 end-to-end.
- Preserve right-to-left (RTL) text integrity in storage and rendering layers.
- Avoid destructive normalization; if normalization is applied, document the exact method.
- Preserve source chapter/verse numbering exactly and layer mapping metadata separately when alternate traditions are required.
