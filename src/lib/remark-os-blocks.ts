import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const OSES = ['mac', 'ubuntu'] as const;

/**
 * Remark plugin: OS-specific content with an interactive switch.
 *
 *   :::mac                 → <div class="os-block" data-os="mac">…</div>
 *   …markdown…
 *   :::
 *
 *   :::ubuntu
 *   …markdown…
 *   :::
 *
 * Only the markup is emitted here; the switching itself is a progressive
 * enhancement — the script in `src/pages/[...slug].astro` turns the title bar
 * of every code frame inside a block into macOS / Ubuntu tabs, which set
 * `<html data-os>`; `content.css` hides the other OS's blocks. Without JS
 * (or `data-os` unset) every block stays visible, so nothing is lost.
 *
 * Needs `remarkDirective` earlier in the chain. Avoid `##` headings inside a
 * block: both variants would produce the same heading slug.
 *
 * Repo-local only, like `remarkMermaid`: the editor's live preview does not
 * include it, so there the blocks render as plain text.
 */
export function remarkOsBlocks() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (node.type === 'containerDirective' && (OSES as readonly string[]).includes(node.name)) {
        const data = node.data || (node.data = {});
        data.hName = 'div';
        data.hProperties = { className: ['os-block'], 'data-os': node.name };
      }
    });
  };
}
