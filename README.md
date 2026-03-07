# Sacred

## Website

A complete static website is available with:

- landing page: [`index.html`](index.html)
- Hebrew Bible reader: [`hebrew-bible/index.html`](hebrew-bible/index.html)

To run locally:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/`
- `http://localhost:4173/hebrew-bible/index.html`

## Reference Sources

Source provenance, licensing notes, schemas, and import documentation are maintained under [`reference/hebrew-bible/`](reference/hebrew-bible/).

## Hebrew Bible reader page

The reader page includes:

- book and chapter selectors
- Hebrew verse rendering with right-to-left layout
- status messaging for loading/empty/error states
- optional deep-link query params (for example `?book=genesis&chapter=1`)
- search/navigation helpers (reference parsing, verse jump, and Hebrew text lookup)

The reader uses the data layer in [`src/data/hebrewBible/`](src/data/hebrewBible/) and is designed to remain static-host friendly.
