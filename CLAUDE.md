# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local Markdown documentation viewer **and editor** built on Astro 5. The `.md`
docs live in an **external directory** (never committed here); this repo is only
the rendering and editing technology. See `PLAN.md` for the full roadmap — Fases
0–3 are implemented.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set `DOCS_DIR` to the absolute path of your
   docs folder. `content.config.ts` **throws** if `DOCS_DIR` is unset — there is
   no in-repo fallback.
3. `npm run dev`

## Commands

- `npm run dev` — start the dev server (http://localhost:4321)
- `npm run build` — build to `dist/`
- `npm run preview` — serve the built site locally
- `npm run astro -- <cmd>` — any Astro CLI subcommand (e.g. `npm run astro -- sync`
  to regenerate `astro:content` types after editing the collection schema)

There is no test runner, linter, or formatter configured. TypeScript is
`astro/tsconfigs/strict`; `@astrojs/check` is not installed, so `npm run build` is
the practical type gate.

## Architecture

`output: 'static'` with the `@astrojs/node` adapter (`standalone`). Doc pages are
prerendered to plain HTML under `dist/client/`; the adapter only exists so the
editor's on-demand routes (`/api/preview`, `/api/save`, `.../edit`) can opt out
of prerendering (`export const prerender = false`). Every one of those routes
also guards on `import.meta.env.DEV` and returns 404/403 otherwise, so even when
the Node server runs the published site the editor stays unreachable — it is a
`npm run dev` tool only.

### How a doc page is composed

- **Content**: `content.config.ts` defines one collection, `techDocs`, loaded via
  `glob({ pattern: '**/*.md', base: process.env.DOCS_DIR })`. The schema is
  deliberately lax — `z.object({ title, tagline }).passthrough()` — so a doc is
  just Markdown with optional `title`/`tagline` frontmatter. Those two fields feed
  the index cards, `<title>` and meta description; nothing else is read.
- **Route**: `src/pages/tech-docs/[...slug].astro` is the single dynamic page.
  `getStaticPaths()` maps every collection entry to `params.slug = doc.id`, and
  the body renders as `<article class="doc"><Content /></article>`.
- **Index**: `src/pages/index.astro` lists the collection and links to
  `/tech-docs/${doc.id}`. Dropping a `.md` file into `DOCS_DIR` makes it appear —
  no code changes.

### Markdown pipeline — `src/lib/markdown.ts`

Single source of truth for Markdown → HTML, so the published page and the editor
preview can never diverge. It exports `remarkPlugins`, `rehypePlugins` and
`shikiTheme`, all consumed by `astro.config.mjs` (`markdown.*`), plus
`renderMarkdown()` (used by `/api/preview` and the initial server render of the
edit page) and `splitFrontmatter()` (used by the edit page and both endpoints to
strip the YAML block identically).

- **Admonitions**: `remark-directive` parses `:::note` / `:::info` / `:::tip` /
  `:::warning` / `:::danger`; `remarkAdmonitions` rewrites each into
  `<aside class="admonition admonition-<kind>">` with a titled header. An inline
  label — `:::warning[Heads up]` — overrides the default title.
- **Code frame**: `rehypeCodeFrame` wraps every top-level `<pre>` in
  `<figure class="expressive-code">` with a copy button, matching the old `<Code>`
  component's frame. The button is wired by a `<script>` in `[...slug].astro` for
  the published page and by an identical `wireCopyButtons()` in the edit page for
  the preview pane.
- Syntax highlighting is Astro's built-in Shiki (`markdown.shikiConfig.theme`),
  pinned to the same `shikiTheme` the preview pipeline passes to `@shikijs/rehype`.

### The editor (Fase 2)

Dev-only, reached from the **Edit** link `Layout.astro` adds to a doc page's
header when `import.meta.env.DEV` (driven by the `editSlug` prop from
`[...slug].astro`).

- **`src/pages/tech-docs/[...slug]/edit.astro`** (`prerender = false`): reads the
  raw `.md` from `DOCS_DIR` via `resolveDocPath()` + `fs`, server-renders the
  first preview, then ships a bundled `<script>` that mounts CodeMirror 6
  (`codemirror` basic setup + `lang-markdown` + `theme-one-dark`, line wrapping,
  `Mod-s` to save, `:::`-triggered admonition snippet completions). Split view:
  editor left, a `.doc` preview pane right. Tracks a dirty flag (header status +
  `beforeunload` guard) and shows toasts.
- **`src/pages/api/preview.ts`** (`prerender = false`): `POST { content }` →
  `splitFrontmatter` → validate the YAML with `js-yaml` (422 on failure) →
  `renderMarkdown(body)` → `{ html }`. Called with a ~200 ms debounce; stale
  responses are dropped by a sequence counter.
- **`src/pages/api/save.ts`** (`prerender = false`): `POST { slug, content }`.
  Guards in order — 403 unless `DEV`; `resolveDocPath()` (rejects `..`, absolute,
  non-`.md`); 404 if the target does not already exist (the editor only edits,
  never creates); 422 on invalid frontmatter YAML — then `fs.writeFile`. After a
  successful save the Content Layer's `DOCS_DIR` watch is expected to HMR the
  published page; the preview pane is already current.
- **`src/lib/docs.ts`** — `resolveDocPath()` and `DocPathError`, the path-safety
  boundary shared by the edit page and `/api/save`.

### Shell and styling

- `src/layouts/Layout.astro` wraps the index and doc pages (`<html lang="en">`):
  head, header (with the dev-only Edit link), footer, hash-scroll script. The
  edit page is standalone and imports the stylesheets it needs directly.
- `global.css` — reset, dark-theme tokens, typography, the `.expressive-code`
  frame. `landing.css` — index hero + card grid. `project.css` — the `.section`
  block used by the index, and inline `<code>` outside a doc. `content.css` —
  everything scoped under `.doc`: prose elements plus the admonition colours
  (keyed off the theme tokens in `global.css`); reused as-is by the editor's
  preview pane. `editor.css` — the split-view frame, top bar and toast stack.

## Doc images

Referenced by absolute URL and served from `public/docs/` (e.g.
`![logo](/docs/PokeAPI.webp)`). They are committed with the repo, not with the
external docs — `DOCS_DIR` holds Markdown only.

## Notes

- `dist/` is git-ignored and no build output is committed.
- Adding a new doc = one `.md` file in `DOCS_DIR`. No `.astro` file to copy.
- Deleting or renaming a doc is a filesystem operation in `DOCS_DIR`; the editor
  deliberately has no create/delete UI.
- `npm run build` still emits the CodeMirror client chunk even though the edit
  route 404s in production. It is dead weight on disk, never referenced by a
  served page. Left as-is.
