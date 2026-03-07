# Hebrew Bible reader data layer

This module provides a browser-safe data-access layer for Sacred's normalized Hebrew Bible data.

It is designed for static hosting (including GitHub Pages) and reads from:

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

The module also exports `createHebrewBibleDataLayer(options)` for custom loaders (for tests, alternate paths, or custom `fetch`).

## Data assumptions and guarantees

- Source chapter/verse numbering is preserved as imported.
- Hebrew text is returned exactly as stored in processed data.
- Optional fields are passed through unchanged when present.
- No synthetic morphology/transliteration fields are added.

## Identifier matching

Book identifiers support:

- canonical order number (`1`, `2`, ...)
- normalized slug (`genesis`)
- book labels from data fields (`book`, `bookEnglish`, `bookHebrew`)

Matching is intentionally simple and deterministic.

## Static-site behavior

By default, the layer fetches:

- `reference/hebrew-bible/processed/verses.json`

Use `createHebrewBibleDataLayer({ basePath: '/sacred' })` when your app is served from a subpath.

## Example

```js
import {
  getAllBooks,
  getBook,
  getChaptersForBook,
  getVerses,
  getVerse,
} from './src/data/hebrewBible/index.js';

const books = await getAllBooks();
const genesis = await getBook('genesis');
const chapters = await getChaptersForBook('Genesis');
const genesisOne = await getVerses('genesis', 1);
const genesisOneOne = await getVerse(1, 1, 1); // canonical order 1, chapter 1, verse 1
```

## Future extension points

This layout keeps room for additional reader services without changing the basic API shape:

- verse mapping to translations
- commentary/document overlays
- morphology/lemma indexes
- search indexes
- per-book metadata enrichment
