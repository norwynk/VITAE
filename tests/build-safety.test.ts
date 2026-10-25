import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });

describe('build safety', () => {
  // On Firebase App Hosting, server code that reads public/ from disk makes the build ship only
  // the files it reads, and every other image on the site 404s. Embed or import instead.
  it('no server code reads the public/ folder from disk', () => {
    const offenders = files(path.resolve('src')).filter((f) => {
      const s = readFileSync(f, 'utf8');
      return /from 'node:fs|from "node:fs|require\(['"](node:)?fs/.test(s) && /['"]public['"]/.test(s);
    });
    expect(offenders).toEqual([]);
  });
});
