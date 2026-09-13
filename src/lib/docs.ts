/**
 * Filesystem access to the external docs directory (`DOCS_DIR`).
 *
 * Only the editor endpoints (`/api/save`, `/editor/<slug>`), gated behind
 * `EDITOR_ENABLED`, read or write through here. `astro.config.mjs` copies
 * `DOCS_DIR` onto `process.env` before anything runs; `content.config.ts`
 * throws if it is unset, so by the time these helpers execute the value is
 * guaranteed to exist.
 */
import path from 'node:path';

/** Thrown for a slug that is missing, malformed, or escapes `DOCS_DIR`. */
export class DocPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocPathError';
  }
}

/**
 * Resolve `<slug>.md` to an absolute path inside `DOCS_DIR`, rejecting anything
 * that would climb out of it (`..`, absolute slugs, a non-`.md` target). The
 * returned path is safe to hand to `fs`.
 */
export function resolveDocPath(slug: string | undefined): string {
  const docsDir = process.env.DOCS_DIR;
  if (!docsDir) throw new DocPathError('DOCS_DIR is not set');
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new DocPathError('Missing doc slug');
  }

  const base = path.resolve(docsDir);
  const target = path.resolve(base, `${slug}.md`);

  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new DocPathError('Doc path escapes DOCS_DIR');
  }
  if (path.extname(target) !== '.md') {
    throw new DocPathError('Doc path is not a .md file');
  }
  return target;
}
