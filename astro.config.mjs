// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import node from '@astrojs/node';
import { remarkPlugins, rehypePlugins, shikiTheme } from '@jecaro/md-editor/markdown';

// Load DOCS_DIR from .env / .env.example and expose it on process.env so that
// content.config.ts (which runs outside Vite's env handling) can read it.
const { DOCS_DIR } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
if (DOCS_DIR) {
  process.env.DOCS_DIR = DOCS_DIR;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://tech-docs.local',
  // Stay static by default: doc pages build to plain HTML. The Node adapter is
  // only here so the editor's on-demand routes (`/api/*`, `.../edit`) can opt in
  // with `export const prerender = false` during `astro dev`. On a static host
  // those routes 404, which is the intended read-only behaviour.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // The doc-rendering pipeline ships in @jecaro/md-editor/markdown so the editor
  // preview endpoint reuses the exact same transforms and theme.
  markdown: {
    remarkPlugins,
    rehypePlugins,
    shikiConfig: { theme: shikiTheme },
  },
});
