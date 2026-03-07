# Sacred

## Reference Sources

Source provenance, licensing notes, schemas, and import documentation are maintained under [`reference/hebrew-bible/`](reference/hebrew-bible/).

## Hebrew Bible reader page

A first reading interface is available at [`hebrew-bible/index.html`](hebrew-bible/index.html).

Features included in this first UI:

- book and chapter selectors
- Hebrew verse rendering with right-to-left layout
- status messaging for loading/empty/error states
- optional deep-link query params (for example `?book=genesis&chapter=1`)

The page uses the reader data layer in [`src/data/hebrewBible/`](src/data/hebrewBible/) and is designed to remain static-host friendly.


Additional features now include a first search/navigation layer (reference parsing, verse jump, and Hebrew text lookup) documented in `src/search/hebrewBible/README.md`.
