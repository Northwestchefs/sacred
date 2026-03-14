# Sacred APIs and Study Architecture

## Sefaria API usage

Sacred integrates with public Sefaria endpoints directly from the browser using `fetch`:

- `GET https://www.sefaria.org/api/v3/texts/{ref}` for bilingual text payloads.
- `GET https://www.sefaria.org/api/links/{ref}` for commentary and related links.
- `GET https://www.sefaria.org/api/topics` for topic metadata.
- `GET https://www.sefaria.org/api/search-wrapper?q={query}&type=text&size={n}` for candidate resonance references.

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

## Resonance Engine

`js/tools/resonance-engine.js` adds gematria resonance search:

- `calculatePhraseGematria(text)` computes gematria for arbitrary Hebrew phrases.
- `calculateVerseGematria(ref)` fetches a verse, computes gematria, and returns `{ verse, gematria, hebrew, english }`.
- `findResonantVerses(value)` queries candidate references from Sefaria search and filters for exact gematria matches.

This keeps resonance workflows in a small composable module that can be reused outside the dashboard UI.

## Psalm Analyzer

`js/tools/psalm-analyzer.js` performs structural psalm analysis on a chapter reference (for example `Psalms 23`):

- Iterates each verse.
- Computes per-verse gematria.
- Detects divine names (`יהוה`, `אלהים`, `אל`, `שדי`, `אדני`, `אהיה`).
- Suggests sefirah associations via textual and gematria-based mapping.

`analyzePsalm(ref)` returns an array of:

- `verseNumber`
- `gematria`
- `divineNamesDetected`
- `suggestedSefirah`

## 72 Names generator

`js/tools/72names.js` generates the 72 triplets derived from Exodus 14:19–21:

1. Fetches the three Hebrew verses.
2. Reverses the middle verse.
3. Zips letter-by-letter into three-letter names.

`generate72Names()` returns entries of:

- `name`
- `gematria`
- `sefirotAssociation`

## 231 Gates generator

`js/tools/231gates.js` generates all unordered pairs from the 22-letter Hebrew alphabet.

`generate231Gates()` returns 231 strings such as:

- `"אב"`
- `"אג"`
- `"אד"`

## Tree of Life integration

`js/sefirot-map.js` now supports additional analysis mappings:

- `mapGematriaToSefirot(gematria)` highlights sefirot using numeric resonance.
- `mapDivineNamesToSefirot(names)` maps multiple divine names onto sefirot nodes.
- Existing verse keyword and single-name mapping remain available for tool composition.

## Sacred tools architecture

The study dashboard (`sacred-study.html`) is assembled from modular components and ES modules:

- `components/verse-viewer.html` + `js/torah-viewer.js`: verse input, Hebrew/English rendering, commentary links.
- `components/gematria-tool.html` + `js/gematria.js`: interactive gematria calculator.
- `js/tools/resonance-engine.js`: gematria resonance matching workflow.
- `js/tools/psalm-analyzer.js`: per-verse psalm structure analysis.
- `js/tools/72names.js`: 72 Names extraction engine.
- `js/tools/231gates.js`: 231 Gates pair generation.
- `js/divine-names.js`: divine name gematria, permutation generation, and sefirah mapping.
- `components/tree-of-life.html` + `js/sefirot-map.js`: SVG Tree of Life with verse/name/gematria-based sefirot highlighting.
- `js/sacred-study.js`: orchestrates component loading and cross-tool interactions.

Design constraints honored:

- No backend server.
- Pure static delivery for GitHub Pages.
- Fetch API for all remote data access.
- Clean modular ES module boundaries.

## Scripture Pattern Explorer

The new Scripture Pattern Explorer extends Sacred with reusable pattern-analysis modules and a dedicated UI page (`pages/pattern-explorer.html`).

### Dataset generation

`js/tools/tanakh-gematria-map.js` builds and caches per-book Tanakh verse datasets from Sefaria:

- `buildGematriaDataset(book)` fetches Hebrew chapter text via `getText(book)` and returns rows such as `{ verse: "Genesis 1:1", gematria: 2701 }` (internally with `ref` and source text).
- `getGematriaDistribution(book)` computes a book-level gematria histogram.
- `findVersesByGematria(value)` resolves loaded cached entries matching exact gematria values.

### Heatmap visualization

Gematria heatmaps are rendered in Canvas through:

- `components/gematria-heatmap.html` (UI shell and controls)
- `js/visualization/gematria-heatmap.js` (tile-based color encoding)

Higher gematria values are drawn with darker opacity over a verse grid, with book filtering wired from the Pattern Explorer page.

### Divine name scanning

`js/tools/divine-name-distribution.js` scans scripture for key names:

- `יהוה`
- `אלהים`
- `שדי`
- `אהיה`

`scanBookForDivineNames(book)` returns entries shaped as `{ verse: "Psalm 91:1", name: "שדי" }`.

### Sacred numbers and Tree of Life integration

- `js/tools/sacred-numbers.js` adds `findVersesByNumber(number)` for key values (`7, 12, 26, 42, 72, 144`).
- `js/sefirot-map.js` now includes `mapNumberToSefirot` and `mapPatternResultsToSefirot` so Pattern Explorer results can highlight Tree of Life nodes.
