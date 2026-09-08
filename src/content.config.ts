import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Docs live in an external directory configured via DOCS_DIR (see .env.example).
// astro.config.mjs copies the value onto process.env before this file runs.
// There are zero committed .md files: without DOCS_DIR there is nothing to build.
const DOCS_DIR = process.env.DOCS_DIR;
if (!DOCS_DIR) {
  throw new Error(
    'DOCS_DIR is not set. Copy .env.example to .env and point DOCS_DIR at the ' +
      'absolute path of your Markdown docs folder.',
  );
}

// Lax schema: a doc is just Markdown. `title`/`tagline` are the only fields the
// site reads (index cards, <title>, meta description); anything else in the
// frontmatter is passed through untouched.
const techDocs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: DOCS_DIR }),
  schema: z
    .object({
      title: z.string().optional(),
      tagline: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { techDocs };
