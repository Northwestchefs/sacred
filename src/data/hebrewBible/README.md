# Hebrew Bible reader data layer

This module provides a browser-safe data-access layer for Sacred's normalized Hebrew Bible data.

It is designed for static hosting (including GitHub Pages) and prefers book-level processed files:

- `reference/hebrew-bible/processed/books.json`
- `reference/hebrew-bible/processed/books/<book-slug>.json`

If book-level files are unavailable, it falls back to:

- `reference/hebrew-bible/processed/verses.json`

## Why this exists

The importer pipeline creates normalized verse-level data. Reader features should not directly parse large JSON files in many places.

This layer centralizes:

- loading and caching
- book/chapter/verse lookup
- basic identifier resolution (canonical order, English names, slugs)

## Public API

All functions are async and exported from `index.js`.

- `getAllBooks()`
- `getBook(bookIdentifier)`
- `getChaptersForBook(bookIdentifier)`
- `getVerses(bookIdentifier, chapterNumber)`
- `getVerse(bookIdentifier, chapterNumber, verseNumber)`
- `getAllVerses()`
- `warmCache()`

The module also exports `createHebrewBibleDataLayer(options)` for custom loaders.

## Data assumptions and guarantees

- Source chapter/verse numbering is preserved exactly as imported.
- Hebrew text is returned exactly as stored in processed data.
- Optional fields are passed through unchanged when present.
- No synthetic morphology/transliteration fields are added.

## Static-site behavior

Default fetch order:

1. `reference/hebrew-bible/processed/books.json`
2. `reference/hebrew-bible/processed/books/<book-slug>.json` (lazy per book)
3. fallback to `reference/hebrew-bible/processed/verses.json`

Use `createHebrewBibleDataLayer({ basePath: '/sacred' })` when your app is served from a subpath.
