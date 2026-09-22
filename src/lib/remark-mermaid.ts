import { visit } from 'unist-util-visit';
import type { Root, Code, Html } from 'mdast';
import { renderMermaidBlock } from './mermaid-render';

/**
 * Remark plugin: replace ```mermaid code fences with a pre-rendered
 * `<div class="mermaid">` of static `<img>` data URIs (see
 * `mermaid-render.ts`) — diagrams are always images, rendered once at build
 * time, identical across every viewer instead of re-drawn client-side.
 *
 * Must run BEFORE remarkStashCodeLangs to avoid polluting the code-language
 * queue with mermaid entries that Shiki would try to highlight.
 */
export function remarkMermaid() {
  return async (tree: Root) => {
    const nodes: { node: Code; index: number; parent: Root }[] = [];
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || typeof index !== 'number') return;
      nodes.push({ node, index, parent: parent as Root });
    });

    // Render in document order but replace back-to-front so earlier indices
    // in `parent.children` stay valid as later splices happen.
    for (const { node, index, parent } of [...nodes].reverse()) {
      const html: Html = { type: 'html', value: await renderMermaidBlock(node.value) };
      parent.children.splice(index, 1, html);
    }
  };
}
