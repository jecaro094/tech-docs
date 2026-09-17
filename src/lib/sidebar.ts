import { relative, resolve } from 'node:path';
import type { CollectionEntry } from 'astro:content';

export interface SidebarItem {
  label: string;
  slug: string | null;
  items: SidebarItem[];
}

/**
 * Build a hierarchical sidebar tree from the techDocs collection.
 * Top-level folders become collapsible groups; files without a folder
 * land in a "General" bucket. Items are sorted alphabetically.
 */
export function buildSidebarTree(docs: CollectionEntry<'techDocs'>[]): SidebarItem[] {
  const docsDir = process.env.DOCS_DIR!;
  const GENERAL_GROUP = 'General';
  const groups = new Map<string, CollectionEntry<'techDocs'>[]>();

  for (const doc of docs) {
    const relPath = doc.filePath
      ? relative(docsDir, resolve(process.cwd(), doc.filePath))
      : doc.id;
    const slashIndex = relPath.indexOf('/');
    const group = slashIndex === -1 ? GENERAL_GROUP : relPath.slice(0, slashIndex);
    const groupDocs = groups.get(group) ?? [];
    groupDocs.push(doc);
    groups.set(group, groupDocs);
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([group, groupDocs]) => ({
    label: group,
    slug: null,
    items: groupDocs
      .map((doc) => ({
        label: (doc.data.title ?? doc.id).replace(/-/g, ' '),
        slug: doc.id,
        items: [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

/**
 * Flatten the sidebar tree into an ordered list of slugs for prev/next navigation.
 */
export function flattenSlugs(tree: SidebarItem[]): string[] {
  const slugs: string[] = [];
  for (const group of tree) {
    for (const item of group.items) {
      if (item.slug) slugs.push(item.slug);
    }
  }
  return slugs;
}
