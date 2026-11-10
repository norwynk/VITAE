import { describe, expect, it } from 'vitest';
import RANGE from '../src/brand/range.json';
import { QUIZ_PENS, goalsToAsk, results, withOnlyPens } from '../src/brand/quiz';
import { CATEGORIES, PEN_BRANDS } from '../src/brand/pens';
import { MEN_ANGLES, MEN_CHOICES, MEN_GOALS, MEN_PENS, PEN_HELP, PEN_STORY, forMen, forSide, goalForPen, goalForSide, isForMen } from '../src/brand/sides';
import { GOALS, goalBySlug, goalForCategory } from '../src/brand/goals';
import { GOALS as HELP_ANSWERS, HELP_OPTIONS } from '../src/domain/intake';

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

  it('every men’s goal card opens a goal that exists', () => {
    for (const g of MEN_GOALS) {
      expect(GOALS.map((x) => x.slug)).toContain(g.slug);
    }
  });

  it('every men’s pen is told the men’s way, and only men’s pens are', () => {
    for (const slug of MEN_PENS) expect(MEN_ANGLES[slug]?.transformation).toBeTruthy();
    for (const slug of Object.keys(MEN_ANGLES)) expect(isForMen(slug)).toBe(true);
    for (const c of CATEGORIES) if (forSide(QUIZ_PENS, 'men', (p) => p.id).some((p) => p.category === c.name)) expect(MEN_CHOICES[c.name]).toBeTruthy();
  });

  it('Body Sculpt is blue and painted on the men’s side, unchanged for women', () => {
    const men = forMen(PEN_BRANDS['body-sculpt']);
    expect(men.colours.main).toBe('#2B4C7E');
    expect(men.cardImage).toBeUndefined();
    expect(PEN_BRANDS['body-sculpt'].colours.main).toBe('#B874FF');
    expect(forMen(PEN_BRANDS['full-throttle'])).toBe(PEN_BRANDS['full-throttle']);
  });

  it('the quiz never asks a question with only one answer', () => {
    const men = forSide(QUIZ_PENS, 'men', (p) => p.id);
    expect(goalsToAsk(['Weight & Body'], men)).toEqual([]);
    expect(withOnlyPens({ goals: ['Weight & Body'], hooks: {}, feelings: [] }, men).hooks).toEqual({ 'Weight & Body': 'body-sculpt' });
    expect(results(withOnlyPens({ goals: ['Weight & Body'], hooks: {}, feelings: [] }, men), men)[0].id).toBe('body-sculpt');
    expect(goalsToAsk(['Weight & Body'], QUIZ_PENS)).toEqual(['Weight & Body']);
  });

  it('the screening asks each side in its own words, and every pen says what it helps with', () => {
    for (const p of RANGE.products) for (const h of PEN_HELP[p.id] ?? []) expect(HELP_OPTIONS.women.concat(HELP_OPTIONS.men)).toContain(h);
    for (const p of RANGE.products) expect(PEN_HELP[p.id]?.length).toBeTruthy();
    for (const slug of MEN_PENS) for (const h of MEN_ANGLES[slug].help) expect(HELP_OPTIONS.men).toContain(h);
    expect(MEN_ANGLES['deep-sleep-rebuild'].help).toContain('Muscle and strength');
    for (const h of [...HELP_OPTIONS.women, ...HELP_OPTIONS.men]) expect(HELP_ANSWERS).toContain(h);
  });

  it('a man heading for his body hears about the body he is building, not the scale', () => {
    const g = goalForSide(goalBySlug('weight')!, 'men');
    expect(g.title).toBe('Training hard. Not showing.');
    expect(g.picture).not.toMatch(/scale/i);
    expect(g.image).toBe('');
    for (const h of g.intakeGoals) expect(HELP_OPTIONS.men).toContain(h);
    expect(goalForSide(goalBySlug('weight')!, 'women')).toEqual(goalBySlug('weight'));
  });
});

describe('the screening story', () => {
  it('every pen tells its own story, on both sides', () => {
    for (const b of Object.values(PEN_BRANDS)) {
      const g = goalForPen(goalForCategory(b.category)!, b.slug, 'women');
      expect(g.destination, b.slug).toBe(PEN_STORY[b.slug].destination);
      expect(g.title, b.slug).toBe(b.hook);
    }
    for (const slug of MEN_PENS) {
      const g = goalForPen(goalForCategory(PEN_BRANDS[slug].category)!, slug, 'men');
      expect(g.destination, slug).toBe(MEN_ANGLES[slug].destination);
      expect(g.visionExample, slug).toBe(MEN_ANGLES[slug].example);
      expect(g.title, slug).toBe(MEN_ANGLES[slug].hook);
    }
  });

  it('a man with Deep Sleep Rebuild hears about recovery, never weight', () => {
    const g = goalForPen(goalBySlug('energy')!, 'deep-sleep-rebuild', 'men');
    expect([g.title, g.destination, g.visionExample].join(' ')).not.toMatch(/weight|scale|jeans/i);
    expect(g.destination).toBe('recovery while you sleep');
  });
});
