/**
 * Save endpoint for the editor (Fase 2, point 14).
 *
 * `POST { slug: string, content: string }` → overwrites `<slug>.md` inside
 * `DOCS_DIR`. Guards, in order:
 *   - 403 unless running under `astro dev` (`import.meta.env.DEV`).
 *   - slug resolved with `resolveDocPath` (rejects `..` / absolute / non-`.md`).
 *   - 404 if the target file does not already exist (editor only edits, never
 *     creates — matches the "create/delete by hand" decision in PLAN.md).
 *   - 422 if the frontmatter block is not valid YAML.
 */
import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import { splitFrontmatter } from '@jecaro/md-editor/markdown';
import { resolveDocPath, DocPathError } from '../../lib/docs';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return json({ error: 'Editing is disabled on the published site' }, 403);
  }

  let slug: string;
  let content: string;
  try {
    const body = (await request.json()) as { slug?: unknown; content?: unknown };
    if (typeof body.slug !== 'string' || typeof body.content !== 'string') {
      return json({ error: 'Expected { slug: string, content: string }' }, 400);
    }
    slug = body.slug;
    content = body.content;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { frontmatter } = splitFrontmatter(content);
  if (frontmatter !== null) {
    try {
      yaml.load(frontmatter);
    } catch (err) {
      return json(
        { error: `Invalid frontmatter YAML: ${(err as Error).message}` },
        422,
      );
    }
  }

  let target: string;
  try {
    target = resolveDocPath(slug);
  } catch (err) {
    if (err instanceof DocPathError) return json({ error: err.message }, 400);
    throw err;
  }

  try {
    await fs.access(target);
  } catch {
    return json({ error: `No doc named "${slug}" in DOCS_DIR` }, 404);
  }

  try {
    await fs.writeFile(target, content, 'utf8');
  } catch (err) {
    return json({ error: `Write failed: ${(err as Error).message}` }, 500);
  }

  return json({ ok: true });
};
