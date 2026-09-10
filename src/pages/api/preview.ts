/**
 * Live-preview endpoint for the editor (Fase 2, point 13).
 *
 * Two request shapes:
 *   - `POST { content: string }` — the full raw `.md` buffer. The frontmatter is
 *     split off and validated as YAML; the body is compiled and returned as
 *     `{ html }`. Used by split mode.
 *   - `POST { blocks: string[] }` — N self-contained Markdown fragments, each
 *     compiled independently and returned in order as `{ htmls: string[] }`.
 *     Used by inline mode to render its live-preview block widgets in one call.
 *
 * Both go through the *same* pipeline as the published pages
 * (`@jecaro/md-editor/markdown`) so the preview and the built page can never
 * diverge. Dev-only: 404 in a static build.
 */
import type { APIRoute } from 'astro';
import yaml from 'js-yaml';
import { renderMarkdown, splitFrontmatter } from '@jecaro/md-editor/markdown';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });

  let payload: { content?: unknown; blocks?: unknown };
  try {
    payload = (await request.json()) as { content?: unknown; blocks?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Inline mode: render an array of standalone blocks in one round-trip.
  if (Array.isArray(payload.blocks)) {
    if (!payload.blocks.every((b) => typeof b === 'string')) {
      return json({ error: 'Expected { blocks: string[] }' }, 400);
    }
    try {
      const htmls = await Promise.all(
        (payload.blocks as string[]).map((block) => renderMarkdown(block)),
      );
      return json({ htmls });
    } catch (err) {
      return json({ error: `Render failed: ${(err as Error).message}` }, 500);
    }
  }

  if (typeof payload.content !== 'string') {
    return json({ error: 'Expected { content: string } or { blocks: string[] }' }, 400);
  }
  const content: string = payload.content;

  const { frontmatter, body } = splitFrontmatter(content);
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

  try {
    const html = await renderMarkdown(body);
    return json({ html });
  } catch (err) {
    return json({ error: `Render failed: ${(err as Error).message}` }, 500);
  }
};
