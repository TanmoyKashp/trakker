# TRAKKER

TRAKKER is a local-first PWA for managing a personal PhD application pipeline.

## Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173/` by default.

## Build

```bash
npm run lint
npm run build
```

The production PWA build is written to `dist/`.

## Data Import

The Excel workbooks are converted into reference JSON with:

```bash
npm run import:data
```

Generated reference data lives in `data/` and is mirrored to `public/data/` by the import script for runtime loading and PWA caching. In this workspace the npm script uses the bundled Python runtime that includes the Excel reader dependency.

Current validated import counts:

- Applications: 54
- Application tree nodes: 55
- Application checklist tasks: 20
- Core assets: 24

Reference data and browser-local user state are intentionally separate. User edits, application progress, task states, notes, custom applications, and tree expansion state persist in local browser storage.
# trakker
