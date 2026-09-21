import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/** Icon prefixed onto every GitHub link. Lives under `public/docs` like other doc assets. */
const GITHUB_ICON = '/tech-docs/docs/icons/github.webp';

const GITHUB_LINK = /^https:\/\/github\.com\//;

function isElement(node: unknown, tagName: string): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as Element).type === 'element' &&
    (node as Element).tagName === tagName
  );
}

/**
 * Rehype plugin: prefixes every `<a href="https://github.com/…">` with the
 * GitHub mark, inline, the way a Jira smart link glues its source icon onto
 * the link text — no separate button/chip, just the icon as part of the
 * anchor. When the link text is wrapped in backticks (`` [`repo`](url) ``,
 * the usual style in these docs), the icon is dropped *inside* that `<code>`
 * pill instead of before it, so it reads as one badge rather than an icon
 * bolted onto the outside.
 *
 * Repo-local only, like `remarkMermaid`: `@jecaro/md-editor`'s
 * `renderMarkdown()` (used by the editor's live preview) does not include
 * this plugin, so GitHub links render without the icon there. See
 * CLAUDE.md.
 */
export function rehypeGithubIcon() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string' || !GITHUB_LINK.test(href)) return;

      const icon: Element = {
        type: 'element',
        tagName: 'img',
        properties: { src: GITHUB_ICON, alt: '', className: ['gh-link-icon'] },
        children: [],
      };

      const [first] = node.children;
      const target = isElement(first, 'code') ? first : node;
      target.children.unshift(icon);
    });
  };
}
