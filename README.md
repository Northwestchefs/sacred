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

## Publish to a `.github.io` address

This repo now includes a GitHub Actions workflow that deploys the static files to **GitHub Pages** whenever you push to `main` or `work` (the branch currently used in this repo).

- workflow file: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
- in GitHub, set **Settings → Pages → Source** to **GitHub Actions**
- ensure your default branch is included in the workflow trigger (`main` or `work`) so deployment jobs actually run

Your live URL depends on your repo name:

- If your repo is named `sacred`: `https://northwestchefs.github.io/sacred/`
- If your repo is named `northwestchefs.github.io`: `https://northwestchefs.github.io/`

If you want a URL like:

- `https://northwestchefs.github.io/sksadventures.github.io/`

then the repository name must be exactly `sksadventures.github.io`.

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
