import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import RANGE from '../src/brand/range.json';
import { GOALS } from '../src/brand/goals';
import { MEN_GOALS, goalForSide } from '../src/brand/sides';

/**
 * Everything a visitor can read without an account. The Happy Hormones page
 * (src/components/HappyHormonesPage.tsx) is left out on purpose: it names its
 * three hormone products, and that wording was cleared by the medicines attorney
 * on 2026-11-13. Its homepage band is checked like everything else.
 */
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
  'src/components/brand/HappyHormonesBand.tsx',
  'src/components/brand/RepeatScriptBand.tsx',
  'src/components/site/SiteNav.tsx',
  'src/components/site/SiteFooter.tsx',
  'src/components/site/Marquee.tsx',
  'src/components/PrickListPage.tsx',
  'src/app/the-prick-list/page.tsx',
  'src/components/brand/Explainer.tsx',
  'src/brand/housePens.ts',
];
const read = (f: string) => readFileSync(f, 'utf8');
const ingredients = RANGE.products.flatMap((p) => p.active_ingredient.split(/[+/]|\(/).map((s) => s.trim().replace(/\)$/, '')).filter((s) => s.length > 3));
const names = RANGE.products.map((p) => p.name);
const goalCopy = JSON.stringify([...GOALS, ...GOALS.map((g) => goalForSide(g, 'men')), ...MEN_GOALS]);

/** Code every visitor downloads. It must not carry the pen list, even out of sight. */
const PUBLIC_CODE = ['src/brand/side.ts', 'src/brand/goals.ts', 'src/hooks/useSide.ts', 'src/components/screening/Questionnaire.tsx', 'src/components/member/FitMoment.tsx', 'src/components/brand/GoalCards.tsx'];

describe('what a visitor can read', () => {
  it.each(PUBLIC_CODE)('%s carries no pen data', (file) => {
    expect(read(file)).not.toMatch(/brand\/pens|brand\/sides'|from '\.\/sides'|range\.json|penQuestions|penSafety|useCatalogue|useShortlist/);
  });

  it.each(PUBLIC_SOURCES)('%s names no pen or ingredient', (file) => {
    const text = read(file);
    for (const word of [...names, ...ingredients]) expect(text, word).not.toContain(word);
    expect(text).not.toMatch(/\b(Ozempic|Mounjaro)\b/);
  });

  it.each([...PUBLIC_SOURCES, 'src/brand/source.ts'])('%s talks about protocols, never selling a pen', (file) => {
    // Comments are for developers, so only the words visitors see are checked.
    const text = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(text).not.toMatch(/\b(a|your|the|every|next|first|one|no|order|buy|get|cheapest|fewer|peptide)\s+pens?\b/i);
    expect(text).not.toMatch(/\bpens?\s+(delivered|ships|comes|at your door|is right)/i);
    expect(text).not.toMatch(/testosterone/i);
  });

  it.each(PUBLIC_SOURCES)('%s does not pull in the range', (file) => {
    expect(read(file)).not.toMatch(/brand\/pens|range\.json|server\/catalogue|useCatalogue/);
  });

  it('the goal cards say what is going on, never what you will get', () => {
    expect(goalCopy).not.toMatch(/glow|younger|lean|built|goal weight|spark/i);
  });
});
