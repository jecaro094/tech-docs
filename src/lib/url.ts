/**
 * Prefixes an absolute site path with `base` (`/tech-docs` — see
 * `astro.config.mjs`). `import.meta.env.BASE_URL` does NOT reliably include a
 * trailing slash — it mirrors `base` verbatim, so with `base: '/tech-docs'`
 * (no trailing slash) it is `'/tech-docs'`. Both ends are normalized here so
 * the join always has exactly one slash between them, regardless of how
 * `base` is spelled in the config.
 */
export function withBase(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${base}/${cleanPath}` : `${base}/`;
}
