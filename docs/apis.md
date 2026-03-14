# Sacred APIs and Study Architecture

## Sefaria API usage

Sacred integrates with public Sefaria endpoints directly from the browser using `fetch`:

- `GET https://www.sefaria.org/api/v3/texts/{ref}` for bilingual text payloads.
- `GET https://www.sefaria.org/api/links/{ref}` for commentary and related links.
- `GET https://www.sefaria.org/api/topics` for topic metadata.

The wrapper module (`js/sefaria-api.js`) exports:

- `getText(ref)`
- `getLinks(ref)`
- `getTopics()`

All requests are executed client-side to remain compatible with static GitHub Pages hosting.

## Gematria module

`js/gematria.js` provides a standard Hebrew gematria engine with final letter handling:

- `calculateGematria(text)` returns the full numeric value.
- `breakdownByLetter(text)` returns letter-by-letter value entries.

This module is reused by the dashboard gematria calculator and divine name analysis tools.

## Sacred tools architecture

The study dashboard (`sacred-study.html`) is assembled from modular components and ES modules:

- `components/verse-viewer.html` + `js/torah-viewer.js`: verse input, Hebrew/English rendering, commentary links.
- `components/gematria-tool.html` + `js/gematria.js`: interactive gematria calculator.
- `js/divine-names.js`: divine name gematria, permutation generation, and sefirah mapping.
- `components/tree-of-life.html` + `js/sefirot-map.js`: SVG Tree of Life with verse/name-to-sefirot highlighting.
- `js/sacred-study.js`: orchestrates component loading and cross-tool interactions.

Design constraints honored:

- No backend server.
- Pure static delivery for GitHub Pages.
- Fetch API for all remote data access.
- Clean modular ES module boundaries.
