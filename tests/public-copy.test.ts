import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import RANGE from '../src/brand/range.json';
import { GOALS } from '../src/brand/goals';
import { MEN_GOALS, goalForSide } from '../src/brand/sides';

/** Everything a visitor can read without an account. */
const PUBLIC_SOURCES = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/men/page.tsx',
  'src/app/opengraph-image.tsx',
  'src/app/manifest.ts',
  'src/app/start/page.tsx',
  'src/app/about/page.tsx',
  'src/app/royal-prick/page.tsx',
  'src/components/HomePage.tsx',
  'src/components/MenHomePage.tsx',
  'src/components/AboutPage.tsx',
  'src/components/RoyalPrickPage.tsx',
  'src/components/brand/BrandHero.tsx',
  'src/components/brand/GoalCards.tsx',
  'src/components/brand/Sections.tsx',
  'src/components/brand/RoyalPrickBand.tsx',
  'src/components/brand/RepeatScriptBand.tsx',
  'src/components/site/SiteNav.tsx',
  'src/components/site/SiteFooter.tsx',
  'src/components/site/Marquee.tsx',
];
const read = (f: string) => readFileSync(f, 'utf8');
const ingredients = RANGE.products.flatMap((p) => p.active_ingredient.split(/[+/]|\(/).map((s) => s.trim().replace(/\)$/, '')).filter((s) => s.length > 3));
const names = RANGE.products.map((p) => p.name);
const goalCopy = JSON.stringify([...GOALS, ...GOALS.map((g) => goalForSide(g, 'men')), ...MEN_GOALS]);

describe('what a visitor can read', () => {
  it.each(PUBLIC_SOURCES)('%s names no pen, ingredient or peptide', (file) => {
    const text = read(file);
    for (const word of [...names, ...ingredients, 'SAHPRA']) expect(text, word).not.toContain(word);
    expect(text).not.toMatch(/peptide/i);
    expect(text).not.toMatch(/\b(Ozempic|Mounjaro)\b/);
  });

  it.each(PUBLIC_SOURCES)('%s does not pull in the range', (file) => {
    expect(read(file)).not.toMatch(/brand\/pens|range\.json|server\/catalogue|PenStage/);
  });

  it('the goal cards say what is going on, never what you will get', () => {
    expect(goalCopy).not.toMatch(/glow|younger|lean|built|goal weight|spark/i);
  });
});
