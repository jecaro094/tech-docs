# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local Markdown documentation viewer **and editor** built on Astro 5. The `.md`
docs live in an **external directory** (never committed here); this repo is only
the rendering host. The Markdown pipeline and the editor itself were extracted to
the standalone package **[`@jecaro/md-editor`](https://github.com/jecaro094/md-editor)**
and are consumed here as a git dependency pinned to a tag
(`github:jecaro094/md-editor#v0.1.0` in `package.json`). See `PLAN.md` for the
full roadmap — the original viewer/editor roadmap (Fases 0–3) and the extraction
roadmap (Fases E0–E5) are both implemented.

## Setup

1. `npm install` (pulls `@jecaro/md-editor` from GitHub at tag `v0.1.0`; its
   `prepare` script builds its `dist/` on install).
2. Copy `.env.example` to `.env` and set `DOCS_DIR` to the absolute path of your
   docs folder. `content.config.ts` **throws** if `DOCS_DIR` is unset — there is
   no in-repo fallback.
3. `npm run dev`

### Iterating on `@jecaro/md-editor` locally

To hack on the editor package against this repo, `npm link` it instead of the
tagged tarball:

```sh
# in the md-editor checkout
npm install && npm run build && npm link
# back here
npm link @jecaro/md-editor
```

`npm run dev` in the package rebuilds `dist/` on change. Undo with
`npm unlink @jecaro/md-editor && npm install`. To ship a change, cut a new tag in
`md-editor` and bump the `#v0.x.y` ref in `package.json` here.

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

### Markdown pipeline — `@jecaro/md-editor/markdown`

The pipeline no longer lives in this repo. It ships from the package's
`/markdown` subpath — a DOM-free, CodeMirror-free entrypoint, so importing it
does not drag the editor into the build. It is the single source of truth for
Markdown → HTML, so the published page and the editor preview can never diverge.

- `astro.config.mjs` imports `remarkPlugins`, `rehypePlugins` and `shikiTheme`
  from it and feeds them to `markdown.*` (Astro's built-in Shiki is pinned to the
  same `shikiTheme`).
- `src/pages/api/preview.ts` and `src/pages/tech-docs/[...slug]/edit.astro` import
  `renderMarkdown()` (compile a body to HTML) and `splitFrontmatter()` (strip the
  YAML block identically).

What the pipeline does — admonitions (`:::note` / `:::info` / `:::tip` /
`:::warning` / `:::danger` → `<aside class="admonition admonition-<kind>">`, with
`:::warning[Heads up]` overriding the title) and the `<figure class="expressive-code">`
code frame with its copy button — is documented in the package. The copy button
is wired by a `<script>` in `[...slug].astro` on the published page; the editor
preview wires its own inside `mountEditor`.

### The editor

Dev-only, reached from the **Edit** link `Layout.astro` adds to a doc page's
header when `import.meta.env.DEV` (driven by the `editSlug` prop from
`[...slug].astro`). The editor UI — CodeMirror 6, the inline / split / source
modes, dirty tracking, toasts, the top bar, the `/` slash menu, `:::` completions
— all lives in `@jecaro/md-editor`'s `mountEditor()`. This repo keeps only the
host and the security boundary:

- **`src/pages/tech-docs/[...slug]/edit.astro`** (`prerender = false`): guards on
  `import.meta.env.DEV` (404 otherwise), reads the raw `.md` from `DOCS_DIR` via
  `resolveDocPath()` + `fs`, server-renders the first preview with
  `renderMarkdown()` (passed to `mountEditor` as `initialPreviewHtml` for a
  flash-free first paint), then ships a `<script>` that calls `mountEditor(app, {
  value, mode: 'inline', renderer: remoteRenderer('/api/preview'), onSave:
  httpSave('/api/save', { extra: { slug } }), … })`. `resolveDocPath`, the DEV
  guard and every disk access stay here — the package never touches the
  filesystem.
- **`src/pages/api/preview.ts`** (`prerender = false`): two request shapes.
  `POST { content }` → `splitFrontmatter` → validate the YAML with `js-yaml` (422
  on failure) → `renderMarkdown(body)` → `{ html }` (split mode, ~200 ms
  debounce, stale responses dropped by a sequence counter). `POST { blocks:
  string[] }` → each fragment compiled independently → `{ htmls: string[] }`
  (inline mode renders its block widgets in one round-trip).
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
- **In this repo**: `global.css` — reset, dark-theme tokens, typography, the
  `.expressive-code` frame. `landing.css` — index hero + card grid. `project.css`
  — the `.section` block used by the index, and inline `<code>` outside a doc.
  `content.css` — now just site chrome (`.doc-back`); the `.doc` prose and
  admonition styles moved to the package.
- **From `@jecaro/md-editor`**: `styles/doc.css` — everything scoped under `.doc`
  (prose + admonition colours, keyed off `--fg` etc. with fallbacks so it also
  works standalone; here it inherits `global.css`'s tokens). Imported by
  `Layout.astro` for the published page and by `edit.astro` for the preview.
  `styles/editor.css` — the editor chrome, top bar and toast stack.
  `styles/inline.css` — inline-mode syntax marks and block widgets. The last two
  are imported only by `edit.astro`.

## Doc images

Referenced by absolute URL and served from `public/docs/` (e.g.
`![logo](/docs/PokeAPI.webp)`). They are committed with the repo, not with the
external docs — `DOCS_DIR` holds Markdown only.

## Notes

- `dist/` is git-ignored and no build output is committed.
- Adding a new doc = one `.md` file in `DOCS_DIR`. No `.astro` file to copy.
- Deleting or renaming a doc is a filesystem operation in `DOCS_DIR`; the editor
  deliberately has no create/delete UI.
- `npm run build` still emits the editor's client chunk (`edit.astro_…` under
  `dist/client/_astro/`, ~650 kB — CodeMirror + the inline pipeline, now pulled
  in transitively via `@jecaro/md-editor`) even though the edit route 404s in
  production. It is dead weight on disk, never referenced by a served page. Left
  as-is: Astro bundles a page's `<script>` regardless of the route's runtime
  guard, and the alternative (splitting the editor into a route that only exists
  under `astro dev`) is not worth the indirection for a file nobody serves.
