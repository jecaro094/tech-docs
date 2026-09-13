// @ts-check
import { defineConfig, envField } from 'astro/config';
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
  site: 'https://jecaro094.github.io',
  base: '/tech-docs',
  // Stay static by default: doc pages build to plain HTML. The Node adapter is
  // only here so the editor's on-demand routes (`/api/*`, `/editor/**`) can opt
  // in with `export const prerender = false` during `astro dev`. On a static
  // host those routes 404, which is the intended read-only behaviour.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // The editor switch. Unset it still turns on under `astro dev`; a build only
  // exposes the editor when this is explicitly `true`. See
  // src/lib/editor-enabled.ts.
  env: {
    schema: {
      ENABLE_EDITOR: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
  // The doc-rendering pipeline ships in @jecaro/md-editor/markdown so the editor
  // preview endpoint reuses the exact same transforms and theme.
  markdown: {
    remarkPlugins,
    rehypePlugins,
    shikiConfig: { theme: shikiTheme },
  },
  // A `npm link`ed @jecaro/md-editor resolves through node_modules as a
  // symlink; without this, Vite can resolve it to two different module
  // identities (real path vs. symlink path) and duplicate the module.
  // NOTE: this does NOT give live-reload across the symlink — Vite/chokidar
  // does not reliably pick up changes written through it. After rebuilding
  // md-editor you still need to restart `npm run dev` here. See CLAUDE.md.
  vite: {
    resolve: { preserveSymlinks: true },
  },
});
