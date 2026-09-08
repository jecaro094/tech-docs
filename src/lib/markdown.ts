/**
 * Shared Markdown pipeline.
 *
 * This module is the single source of truth for how a doc's Markdown body turns
 * into HTML. It is consumed in two places that must stay byte-for-byte in sync:
 *
 *   - `astro.config.mjs` → `markdown.remarkPlugins` / `rehypePlugins` /
 *     `shikiConfig`, which renders the published static pages.
 *   - `src/pages/api/preview.ts` (Fase 2) → `renderMarkdown()`, which renders the
 *     live editor preview.
 *
 * Keep every transform here so the two paths can never drift.
 */
import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot, Element } from 'hast';
import { visit, SKIP } from 'unist-util-visit';
import { toString as mdastToString } from 'mdast-util-to-string';
import remarkDirective from 'remark-directive';

/** Shiki theme for fenced code blocks. Matches the theme CLAUDE.md documents. */
export const shikiTheme = 'night-owl' as const;

/**
 * Split a raw `.md` string into its YAML frontmatter block and the Markdown
 * body. Shared by the editor page and the `/api/*` endpoints so all three strip
 * frontmatter identically before rendering or validating it.
 */
export function splitFrontmatter(raw: string): {
  frontmatter: string | null;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  return match
    ? { frontmatter: match[1], body: raw.slice(match[0].length) }
    : { frontmatter: null, body: raw };
}

type AdmonitionKind = 'note' | 'info' | 'tip' | 'warning' | 'danger';

/** Container-directive names we understand, with their default title + icon. */
const ADMONITIONS: Record<AdmonitionKind, { label: string; icon: string }> = {
  note: { label: 'Note', icon: '✎' },
  info: { label: 'Info', icon: 'ℹ' },
  tip: { label: 'Tip', icon: '★' },
  warning: { label: 'Warning', icon: '▲' },
  danger: { label: 'Danger', icon: '■' },
};

/**
 * `remark` transform: turn `:::warning ... :::` container directives into
 * `<aside class="admonition admonition-warning">` blocks with a titled header.
 * An optional inline label — `:::warning[Heads up]` — overrides the default title.
 * Runs after `remark-directive`, which does the `:::` parsing.
 */
export function remarkAdmonitions() {
  return (tree: MdastRoot) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective') return;
      const kind = node.name as AdmonitionKind;
      const config = ADMONITIONS[kind];
      if (!config) return; // unknown `:::name` — leave it for remark-rehype to drop

      let title = config.label;
      const first = node.children[0];
      if (first?.type === 'paragraph' && first.data?.directiveLabel) {
        title = mdastToString(first);
        node.children.shift();
      }

      const data = node.data || (node.data = {});
      data.hName = 'aside';
      data.hProperties = {
        className: ['admonition', `admonition-${kind}`],
        role: 'note',
      };

      node.children.unshift({
        type: 'paragraph',
        data: {
          hName: 'p',
          hProperties: { className: ['admonition-title'] },
        },
        children: [
          {
            type: 'text',
            data: { hName: 'span', hProperties: { className: ['admonition-icon'], 'aria-hidden': 'true' } },
            value: config.icon,
          },
          { type: 'text', value: ` ${title}` },
        ],
      } as any);
    });
  };
}

/**
 * `rehype` transform: wrap every top-level `<pre>` in the `.expressive-code`
 * frame (with a copy button) so fenced code blocks in prose match the framed
 * code samples the old `<Code>` component produced. The button is wired by an
 * inline script on the page / preview.
 */
export function rehypeCodeFrame() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || parent == null || index == null) return;
      if (
        parent.type === 'element' &&
        Array.isArray((parent.properties?.className as unknown[])) &&
        (parent.properties!.className as unknown[]).includes('expressive-code')
      ) {
        return;
      }

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['expressive-code'] },
        children: [
          {
            type: 'element',
            tagName: 'button',
            properties: {
              type: 'button',
              className: ['copy-btn'],
              'aria-label': 'Copy code to clipboard',
            },
            children: [{ type: 'text', value: '⧉' }],
          },
          node,
        ],
      };

      (parent.children as unknown[])[index] = figure;
      return [SKIP, index + 1];
    });
  };
}

/** Plugins shared by the Astro build and the editor preview (order matters:
 * `remark-directive` parses `:::`, then `remarkAdmonitions` rewrites the nodes). */
export const remarkPlugins = [remarkDirective, remarkAdmonitions];
export const rehypePlugins = [rehypeCodeFrame];

/**
 * Standalone renderer for the editor preview endpoint. Mirrors the Astro build:
 * same remark/rehype transforms, same Shiki theme. `remark-directive` and Shiki
 * are added here explicitly because, unlike the Astro pipeline, nothing else
 * wires them up.
 */
export async function renderMarkdown(body: string): Promise<string> {
  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkRehype },
    { default: rehypeShiki },
    { default: rehypeStringify },
  ] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
    import('remark-rehype'),
    import('@shikijs/rehype'),
    import('rehype-stringify'),
  ]);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkAdmonitions)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki, { theme: shikiTheme })
    .use(rehypeCodeFrame)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(body);

  return String(file);
}
