import type { MermaidConfig } from 'mermaid';

/**
 * Secondary accents reused from the site's admonition palette
 * (@jecaro/md-editor/styles/doc.css: .admonition-warning / .admonition-danger),
 * so diagrams pick up the same "warm" and "alert" hues the rest of the site
 * already uses instead of a single flat blue. These are fixed hex (not theme
 * tokens) because the site itself uses them unchanged across light/dark.
 */
const AMBER = '#e0b341';
const CORAL = '#f2555a';

/**
 * Mermaid parses `themeVariables` colors with its own internal color library
 * (not the browser's CSS engine), which does not understand `color-mix()` —
 * passing it that string throws "Unsupported color format" and aborts the
 * whole render. Letting the browser resolve it first (via `getComputedStyle`
 * or a canvas `fillStyle` round-trip) isn't reliable either: depending on the
 * engine it can normalize to a `color(srgb ...)` string, which Mermaid's
 * parser rejects too. So blend the two hex colors by hand and format the
 * result as a plain `#rrggbb` string, which Mermaid always understands.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixHex(a: string, b: string, aWeight: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x * aWeight + y * (1 - aWeight));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(ar, br))}${toHex(mix(ag, bg))}${toHex(mix(ab, bb))}`;
}

/**
 * Builds Mermaid's `themeVariables` from the site's current CSS custom
 * properties (global.css) so diagrams render in the page's own palette
 * instead of Mermaid's generic built-in 'dark'/'default' themes. Read at
 * render time (not module load) so it tracks the live `data-theme`.
 */
export function buildMermaidThemeVariables(): NonNullable<MermaidConfig['themeVariables']> {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();

  const bg = token('--bg');
  const bgRaised = token('--bg-raised');
  const fg = token('--fg');
  const muted = token('--muted');
  const accent = token('--accent');
  const border = token('--border');
  const fontFamily = token('--font-sans') || 'Inter, sans-serif';

  const amberTint = mixHex(AMBER, bgRaised, 0.1);
  const coralTint = mixHex(CORAL, bgRaised, 0.08);
  const clusterTint = mixHex(AMBER, bg, 0.06);
  const noteTint = mixHex(AMBER, bgRaised, 0.16);

  return {
    fontFamily,
    background: bg,
    mainBkg: bgRaised,
    // Primary nodes: the site's blue accent.
    primaryColor: bgRaised,
    primaryTextColor: fg,
    primaryBorderColor: accent,
    // Secondary nodes: amber — gives flowcharts a warm counterpoint to the
    // blue primaries instead of everything reading as one monochrome family.
    secondaryColor: amberTint,
    secondaryBorderColor: AMBER,
    // Tertiary nodes: coral, for a third distinct accent.
    tertiaryColor: coralTint,
    tertiaryBorderColor: CORAL,
    lineColor: muted,
    textColor: fg,
    nodeTextColor: fg,
    nodeBorder: border,
    // Subgraphs/clusters get the amber accent so grouping reads visually
    // distinct from individual nodes.
    clusterBkg: clusterTint,
    clusterBorder: AMBER,
    edgeLabelBackground: bgRaised,
    // Sequence diagrams
    actorBkg: bgRaised,
    actorBorder: accent,
    actorTextColor: fg,
    actorLineColor: muted,
    signalColor: muted,
    signalTextColor: fg,
    labelBoxBkgColor: bgRaised,
    labelBoxBorderColor: border,
    labelTextColor: fg,
    loopTextColor: fg,
    noteBkgColor: noteTint,
    noteBorderColor: AMBER,
    noteTextColor: fg,
    // Git graph branches: cycle blue / amber / coral / muted.
    git0: accent,
    git1: AMBER,
    git2: CORAL,
    git3: muted,
  };
}
