import { renderMermaidBlock } from './mermaid-render';

/**
 * Text-level counterpart of `remarkMermaid` (see `remark-mermaid.ts`) for the
 * two surfaces that don't go through Astro's own remark pipeline: the editor
 * preview (`/api/preview`) and the editor page's server-rendered first paint
 * (`/editor/[...slug]`). Both call `renderMarkdown()` straight from
 * `@jecaro/md-editor/markdown`, whose plugin list is fixed by the package —
 * there's no hook to inject a local remark plugin there (see CLAUDE.md).
 *
 * So instead of an AST transform, this splices the same rendered
 * `<div class="mermaid">` markup into the raw Markdown *string* before it
 * reaches `renderMarkdown()`, as an HTML block remark passes through
 * unchanged. A matched fence must start at the beginning of a line (standard
 * fenced-code-block syntax); nesting a ```mermaid fence inside another fence
 * isn't supported, same as `remarkMermaid`.
 */
const MERMAID_FENCE = /^ {0,3}```mermaid[ \t]*\r?\n([\s\S]*?)^ {0,3}```[ \t]*$/gm;

export async function preprocessMermaidFences(markdown: string): Promise<string> {
  const matches = [...markdown.matchAll(MERMAID_FENCE)];
  if (matches.length === 0) return markdown;

  const replacements = await Promise.all(
    matches.map((m) => renderMermaidBlock(m[1])),
  );

  let result = '';
  let cursor = 0;
  matches.forEach((m, i) => {
    const start = m.index ?? 0;
    result += markdown.slice(cursor, start);
    result += `\n${replacements[i]}\n`;
    cursor = start + m[0].length;
  });
  result += markdown.slice(cursor);
  return result;
}
