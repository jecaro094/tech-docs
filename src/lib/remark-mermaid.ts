import { visit } from 'unist-util-visit';
import type { Root, Code, Html } from 'mdast';

/**
 * Remark plugin: transform ```mermaid code fences into <div class="mermaid">
 * elements so that Mermaid client-side can render them on page load.
 *
 * Must run BEFORE remarkStashCodeLangs to avoid polluting the code-language
 * queue with mermaid entries that Shiki would try to highlight.
 */
export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || typeof index !== 'number') return;

      const htmlNode: Html = {
        type: 'html',
        value: `<div class="mermaid">${escapeHtml(node.value)}</div>`,
      };

      parent.children.splice(index, 1, htmlNode);
    });
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
