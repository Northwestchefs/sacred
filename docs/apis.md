# Sacred Mystical Analysis APIs

## `js/tools/resonance-engine.js`
Gematria resonance tools for Hebrew text and verse matching.

### Exports
- `calculateVerseGematria(ref)`
  - Fetches Hebrew text for a verse reference from Sefaria and returns gematria, cleaned text, and mapped sefirah.
- `findMatchingGematria(value)`
  - Searches indexed Hebrew Bible verses for identical gematria values and returns verse metadata with Sefaria links.
- `initResonanceEngine({ onSefirahChange })`
  - Binds UI controls for Hebrew text input, gematria calculation, and verse match rendering.

## `js/tools/psalm-analyzer.js`
Psalm-level structural and symbolic analysis.

### Exports
- `analyzePsalm(psalmNumber)`
  - Loads Psalm verses from indexed dataset and computes:
    - structural summary
    - per-verse gematria
    - divine-name detection
    - sefirotic mapping
- `detectDivineNames(text)`
  - Returns detected divine names from a predefined set.
- `initPsalmAnalyzer({ onSefirahChange })`
  - Connects analyzer controls to dashboard output.

## `js/tools/72names.js`
72 Names generator based on Exodus 14:19–21.

### Exports
- `generate72Triplets()`
  - Fetches the three verses from Sefaria, applies the traditional 72-letter extraction pattern, and returns 72 triplets with gematria and sefirot mapping.
- `init72NamesExplorer({ onSefirahChange })`
  - Wires generation action to dashboard rendering.

## `js/tools/231gates.js`
Combinatorial Hebrew pair generator.

### Exports
- `generate231Gates()`
  - Produces all 231 unique letter pairs from the 22 Hebrew letters with gematria and sefirot mapping.
- `init231GatesGenerator({ onSefirahChange })`
  - Wires generation action to dashboard rendering.

## Shared utilities
`js/tools/hebrew-utils.js` provides:
- Hebrew letter values and alphabet constants
- gematria calculation helpers
- text normalization helpers
- divine name constants
- value-to-sefirah mapping

## UI integration
The `sacred-study.html` dashboard initializes modules through `js/pages/sacred-study.js`, which keeps the Tree of Life visualization synchronized with the active module result.
