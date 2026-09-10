/**
 * Live-preview endpoint for the editor (Fase 2, point 13).
 *
 * `POST { content: string }` — the full raw `.md` buffer. The frontmatter is
 * split off and validated as YAML; the body is compiled through the *same*
 * pipeline as the published pages (`@jecaro/md-editor/markdown`) so the preview and the
 * built page can never diverge. Dev-only: 404 in a static build.
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

  let content: string;
  try {
    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content !== 'string') {
      return json({ error: 'Expected { content: string }' }, 400);
    }
    content = body.content;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

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
