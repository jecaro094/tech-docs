/**
 * Whether the dev-only Markdown editor — the header **Edit** link, `/editor/**`,
 * `/api/preview` and `/api/save` — is reachable in this context.
 *
 * `ENABLE_EDITOR` (declared in `astro.config.mjs`, read here via `astro:env`) is
 * the explicit switch. When it is unset the editor still turns on under
 * `astro dev`, so local authoring needs no configuration. A static `astro build`
 * has `import.meta.env.DEV === false`, so the published site is governed solely
 * by `ENABLE_EDITOR`, which defaults to `false` — set the repo variable of the
 * same name (or a local `.env`, see `.env.example`) to `true` to override.
 */
import { ENABLE_EDITOR } from 'astro:env/server';

export const EDITOR_ENABLED = ENABLE_EDITOR || import.meta.env.DEV;
