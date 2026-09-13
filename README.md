# Tech Docs

A Markdown documentation viewer and editor built on Astro 5, published at
**https://jecaro094.github.io/tech-docs**.

The `.md` files live under `docs/` in this repo. Run it with `npm run dev` and
you get a dark-themed doc site with a live editor; run `npm run build` and you
get a read-only static site — that's what gets deployed.

## Quick start

```sh
git clone <this repo>
cd tech-docs
npm install
cp .env.example .env          # DOCS_DIR=./docs works out of the box
npm run dev                   # http://localhost:4321/tech-docs
```

`DOCS_DIR` in `.env` points at the folder that holds the Markdown (`./docs` by
default). There is no fallback — `content.config.ts` throws if it is unset or
empty. Drop a `.md` file into that folder and it appears on the index with no
code change; the file name (minus `.md`) is its URL slug.

## Editing

Under `npm run dev` every doc page has an **Edit** link in the header. It opens a
split view — CodeMirror 6 on the left, live preview on the right — that reads and
writes the file straight to `DOCS_DIR`:

- Preview updates ~200 ms after you stop typing, through the exact same Markdown
  pipeline as the published page.
- `Cmd/Ctrl+S` or the **Save** button writes to disk. The header shows
  `Unsaved` / `Saved`, and leaving with unsaved changes prompts.
- Type `:::` for `note` / `info` / `tip` / `warning` / `danger` admonition
  snippets.
- Creating and deleting docs is done by hand in `DOCS_DIR` — the editor only
  edits existing files.

The editor and its endpoints (`/editor/**`, `/api/preview`, `/api/save`) are
gated behind `ENABLE_EDITOR` (see `.env.example`): on under `npm run dev` with
no configuration, off (404/403) on any other build — including the one that
gets deployed to GitHub Pages.

## Deploying

Pushing to `main` runs CI only (a plain `npm run build`, nothing published).
Pushing a `v*` tag builds and publishes to GitHub Pages, then cuts a GitHub
Release:

```sh
git tag v0.2.0
git push origin v0.2.0
```

See `.github/workflows/deploy.yml` and `PLAN-CI-CD.md` for the full pipeline.

## Doc format

A doc is plain Markdown (GFM) with optional frontmatter:

```markdown
---
title: My Doc
tagline: One line shown on the index card
---

# My Doc

Body text, tables, fenced code (Shiki-highlighted, with a copy button)…

:::warning[Heads up]
Admonitions come from `:::note` / `:::info` / `:::tip` / `:::warning` /
`:::danger`. The `[Heads up]` label is optional.
:::
```

Only `title` and `tagline` are read (index cards, `<title>`, meta description).
Anything else in the frontmatter is passed through untouched.

## Images

Referenced by absolute URL, prefixed with the site's base path, and served
from `public/docs/`, e.g. `![logo](/tech-docs/docs/thing.webp)`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server + editor at http://localhost:4321 |
| `npm run build` | Static, read-only build to `dist/` |
| `npm run preview` | Serve the build locally |
| `npm run astro -- sync` | Regenerate `astro:content` types after a schema change |

No linter/formatter/test runner is configured; `npm run build` is the type gate.
See `PLAN.md` for the design rationale and `CLAUDE.md` for the architecture.
