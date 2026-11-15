/**
 * Per-section identity: one colour + one icon per top-level docs folder.
 *
 * To restyle a section (or add one) edit this map — keys are the folder names
 * under `DOCS_DIR`, matched case-insensitively. Folders not listed here (and
 * the root "General" bucket) fall back to `DEFAULT_SECTION`, which uses the
 * site accent. `icon` is the inner markup of a 24×24 stroke icon (Lucide-style).
 */
export interface SectionMeta {
  /** Any CSS colour; used for icons, dots and card accents (never for body text). */
  color: string;
  /** Inner SVG markup for a 24×24, stroke-based icon. */
  icon: string;
}

const SECTIONS: Record<string, SectionMeta> = {
  architecture: {
    color: '#a78bfa',
    icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  },
  projects: {
    color: '#34d399',
    icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  },
  security: {
    color: '#f87171',
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  settings: {
    color: '#fbbf24',
    icon: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  },
  private: {
    color: '#94a3b8',
    icon: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  },
};

export const DEFAULT_SECTION: SectionMeta = {
  color: 'var(--accent)',
  icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
};

export function getSection(name: string): SectionMeta {
  return SECTIONS[name.toLowerCase()] ?? DEFAULT_SECTION;
}
