# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (http://localhost:4321)
- `npm run build` — type-check via `astro check` semantics and build the static site to `dist/`
- `npm run preview` — serve the built `dist/` locally
- `npm run astro -- <cmd>` — run any Astro CLI subcommand (e.g. `npm run astro -- sync` to regenerate `astro:content` types after editing the collection schema)

There is no test runner, linter, or formatter configured. TypeScript is `astro/tsconfigs/strict`.

## Architecture

Astro 5 static site (`output: 'static'`, no SSR, no UI-framework integrations). Every tech-doc landing page is data-driven from a single Markdown file.

### How a tech-doc page is composed

Each documented project needs **two files that share a slug**:

1. `src/content/tech-docs/<slug>.md` — the content entry. Its frontmatter is validated against the `techDocs` collection schema in `src/content.config.ts` (title, tagline, hero CTAs, optional `demo`/`code` blocks, `features[]`, `technologies[]`, `faqs[]`, `cta`). The Markdown body is free prose rendered into the page's "Context" section.
2. `src/pages/tech-docs/<slug>.astro` — the page. It calls `getEntry('techDocs', '<slug>')`, destructures the frontmatter, `render()`s the body, and lays the sections out (hero, context, features, code, tech stack, FAQ, CTA).

`src/pages/index.astro` lists all entries via `getCollection('techDocs')` and links to `/tech-docs/${doc.id}`, so **the `.astro` page filename must equal the `.md` file's id** or the index link 404s. Adding a new doc means copying both files and editing frontmatter; the current `pokeapi.astro` doubles as the template.

### Shared shell and styling

- `src/layouts/Layout.astro` wraps every page: `<head>`, site header/nav, footer, and a script that smooth-scrolls to hash anchors on load. Section ids in pages (`#features`, `#faq`, …) are the nav targets.
- Three global stylesheets imported by the layout: `global.css` (reset, dark theme tokens, typography), `landing.css` (hero, grids, CTA banner), `project.css` (code frame, FAQ, tech grid). Class names in the `.astro` pages must line up with these.
- Code samples render through Astro's built-in `<Code>` component (`astro:components`) with the `night-owl` theme. The "Copy" button in the code frame is wired by an inline `<script>` in the page, not the component.

## Notes

- `dist/index.html` is checked into git even though `dist/` is in `.gitignore`. Don't add more build output; consider `git rm --cached` if it causes churn.
- `Layout.astro` sets `<html lang="es">` while all content is English.
