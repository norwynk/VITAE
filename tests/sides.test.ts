import { describe, expect, it } from 'vitest';
import RANGE from '../src/brand/range.json';
import { QUIZ_PENS, results } from '../src/brand/quiz';
import { MEN_GOALS, MEN_PENS, forSide, isForMen } from '../src/brand/sides';
import { GOALS } from '../src/brand/goals';

describe('the two sides', () => {
  it('the men’s range is real pens, led by TRT, the Wolverine Stack and tesamorelin', () => {
    const ids = RANGE.products.map((p) => p.id);
    for (const slug of MEN_PENS) expect(ids).toContain(slug);
    expect(MEN_PENS.slice(0, 3)).toEqual(['full-throttle', 'rapid-recovery', 'body-sculpt']);
    // Every pen made only for men is on the men's side.
    for (const p of RANGE.products) if ('for_him' in p && p.for_him) expect(isForMen(p.id)).toBe(true);
  });

  it('women see everything; men see only their range', () => {
    expect(forSide(MEN_PENS.concat('the-glow-up'), 'women', (s) => s)).toHaveLength(MEN_PENS.length + 1);
    expect(forSide(MEN_PENS.concat('the-glow-up'), null, (s) => s)).toHaveLength(MEN_PENS.length + 1);
    expect(forSide(MEN_PENS.concat('the-glow-up'), 'men', (s) => s)).toEqual(MEN_PENS);
  });

  it('the men’s quiz only ever matches men’s pens', () => {
    const pool = forSide(QUIZ_PENS, 'men', (p) => p.id);
    for (const pen of QUIZ_PENS) {
      const answers = { goals: [pen.category], hooks: { [pen.category]: pen.id }, feelings: [...pen.feeling] };
      for (const match of results(answers, pool)) expect(isForMen(match.id)).toBe(true);
    }
  });

  it('every men’s goal card opens a quiz goal that exists, with a men’s pen on it', () => {
    for (const g of MEN_GOALS) {
      expect(GOALS.map((x) => x.slug)).toContain(g.slug);
      expect(isForMen(g.pen)).toBe(true);
    }
  });
});
