# Hebrew Bible Reader Search Layer

This module provides the first static-site-friendly search/navigation layer for the Hebrew Bible reader.

## Supported queries

- Book name lookup (`Genesis`, `Gen`, and other aliases present in processed data)
- Chapter references (`Genesis 1`)
- Verse references (`Genesis 1:1`, `Genesis 1 1`)
- Hebrew verse text search (substring match over available verse text)

If processed metadata includes aliases like `Bereshit`, those resolve automatically.

## What this layer does not yet include

- Morphology-aware search
- Transliteration search
- English translation text search
- Cross-reference networks
- Commentary indexing

These can be added by extending the index and query modules rather than rewriting the reader page.

## Module layout

- `parseReference.js`: parses reference-like user input
- `searchIndex.js`: lightweight in-memory index and text matching helpers
- `query.js`: combines reference parsing + verse text search
- `index.js`: public exports

## Integration

The reader page uses this layer to:

- validate book/chapter/verse targets
- provide clickable search results
- support deep links (`?book=...&chapter=...&verse=...`)

The implementation is fully browser-side and requires no backend.
