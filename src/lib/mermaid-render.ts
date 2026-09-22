/**
 * Server-side Mermaid rendering: turns a ```mermaid fence's raw definition
 * into a static `<div class="mermaid">` containing two `<img>` data URIs (one
 * per site theme), so diagrams are always images — never client-side JS —
 * both on the published page and in the editor preview. Mermaid's layout
 * (d3 measuring text via `getBBox`) needs a real DOM, so this drives a
 * headless Chromium via Puppeteer rather than jsdom, which doesn't implement
 * SVG layout.
 *
 * A single browser instance is reused across every diagram in a build and,
 * under `astro dev`, across the process's lifetime (editor preview requests
 * keep reusing it). Results are cached on disk keyed by the diagram source so
 * unchanged diagrams don't pay Chromium's render cost again.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';

const require = createRequire(import.meta.url);
import { buildMermaidThemeVariables, type MermaidThemeName } from './mermaid-theme-tokens';

const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'mermaid');

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

async function renderOne(definition: string, theme: MermaidThemeName): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const mermaidScriptPath = require.resolve('mermaid/dist/mermaid.min.js');
    await page.addScriptTag({ path: mermaidScriptPath });
    const svg = await page.evaluate(
      async (def: string, themeVariables: object) => {
        // @ts-expect-error mermaid is loaded as a global by the injected script tag
        const mermaid = window.mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables,
          securityLevel: 'loose',
        });
        const { svg } = await mermaid.render('mermaid-diagram', def);
        return svg;
      },
      definition,
      buildMermaidThemeVariables(theme),
    );
    return svg;
  } finally {
    await page.close();
  }
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

async function readCache(hash: string): Promise<{ dark: string; light: string } | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${hash}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(hash: string, value: { dark: string; light: string }): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(CACHE_DIR, `${hash}.json`), JSON.stringify(value));
}

/**
 * Renders a Mermaid definition to the themed `<div class="mermaid">` markup.
 * On a rendering failure (invalid diagram syntax), falls back to a plain
 * `<pre>` block showing the error so one bad diagram doesn't fail the whole
 * build.
 */
export async function renderMermaidBlock(definition: string): Promise<string> {
  const hash = createHash('sha1').update(definition).digest('hex');

  let svgs = await readCache(hash);
  if (!svgs) {
    try {
      const [dark, light] = await Promise.all([
        renderOne(definition, 'dark'),
        renderOne(definition, 'light'),
      ]);
      svgs = { dark, light };
      await writeCache(hash, svgs);
    } catch (err) {
      const message = escapeHtml((err as Error).message);
      return `<pre class="mermaid-error">Mermaid render failed: ${message}</pre>`;
    }
  }

  return (
    `<div class="mermaid">` +
    `<img class="mermaid-img mermaid-img-dark" src="${toDataUri(svgs.dark)}" alt="Mermaid diagram" />` +
    `<img class="mermaid-img mermaid-img-light" src="${toDataUri(svgs.light)}" alt="Mermaid diagram" />` +
    `</div>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
