import type { MermaidConfig } from 'mermaid';

/**
 * Node-side counterpart of the old browser `buildMermaidThemeVariables()`
 * (used back when Mermaid rendered client-side): the same colour math, but
 * fed from the two fixed palettes in `src/styles/global.css` (`:root` /
 * `[data-theme="light"]`) instead of `getComputedStyle`, since diagrams are
 * now rendered once at build/preview time in a headless browser with no page
 * chrome — and so no CSS custom properties — loaded.
 */

const AMBER = '#e0b341';
const CORAL = '#f2555a';

const PALETTES = {
  dark: {
    bg: '#0f1115',
    bgRaised: '#171b23',
    fg: '#e1e4e8',
    muted: '#8b949e',
    accent: '#7bb8ff',
    border: '#21262d',
  },
  light: {
    bg: '#ffffff',
    bgRaised: '#f6f8fa',
    fg: '#1f2328',
    muted: '#656d76',
    accent: '#0969da',
    border: '#d0d7de',
  },
} as const;

export type MermaidThemeName = keyof typeof PALETTES;

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

export function buildMermaidThemeVariables(
  theme: MermaidThemeName,
): NonNullable<MermaidConfig['themeVariables']> {
  const { bg, bgRaised, fg, muted, accent, border } = PALETTES[theme];

  const amberTint = mixHex(AMBER, bgRaised, 0.1);
  const coralTint = mixHex(CORAL, bgRaised, 0.08);
  const clusterTint = mixHex(AMBER, bg, 0.06);
  const noteTint = mixHex(AMBER, bgRaised, 0.16);

  return {
    fontFamily: 'Inter, sans-serif',
    background: bg,
    mainBkg: bgRaised,
    primaryColor: bgRaised,
    primaryTextColor: fg,
    primaryBorderColor: accent,
    secondaryColor: amberTint,
    secondaryBorderColor: AMBER,
    tertiaryColor: coralTint,
    tertiaryBorderColor: CORAL,
    lineColor: muted,
    textColor: fg,
    nodeTextColor: fg,
    nodeBorder: border,
    clusterBkg: clusterTint,
    clusterBorder: AMBER,
    edgeLabelBackground: bgRaised,
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
    git0: accent,
    git1: AMBER,
    git2: CORAL,
    git3: muted,
  };
}
