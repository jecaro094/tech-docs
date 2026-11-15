import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, string | undefined>();

/**
 * ISO date of a doc's last edit: the last git commit touching the file, or the
 * file's mtime when it isn't tracked (e.g. the git-ignored `docs/private`).
 * Build-time only. In CI the checkout needs full history (`fetch-depth: 0`),
 * otherwise every tracked file reports the single commit that was fetched.
 */
export function lastModified(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  if (cache.has(filePath)) return cache.get(filePath);

  const abs = resolve(process.cwd(), filePath);
  let iso: string | undefined;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', abs], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) iso = out;
  } catch {
    /* not a git checkout — fall through to mtime */
  }
  if (!iso) {
    try {
      iso = statSync(abs).mtime.toISOString();
    } catch {
      iso = undefined;
    }
  }
  cache.set(filePath, iso);
  return iso;
}

/** Whole minutes to read a Markdown body at ~200 wpm (code blocks excluded), min 1. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/^---[\s\S]*?---/, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const fmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });
export function formatDate(iso: string | undefined): string | undefined {
  return iso ? fmt.format(new Date(iso)) : undefined;
}
