/**
 * Prefixes an absolute site path with `base` (`/tech-docs` — see
 * `astro.config.mjs`). `import.meta.env.BASE_URL` always includes the trailing
 * slash ('/tech-docs/'), so the path passed in must NOT start with '/'.
 */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
