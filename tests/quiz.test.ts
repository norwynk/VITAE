import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/brand/pens';
import { MAX_RESULTS, QUIZ_PENS, RESERVE_ID, feelingChoices, pensIn, results, tiebreakPair } from '../src/brand/quiz';

describe('Find your Prick quiz', () => {
  it('never recommends the higher-strength Reserve', () => {
    expect(QUIZ_PENS.map((p) => p.id)).not.toContain(RESERVE_ID);
  });

  it('can reach every other pen, each through its own answers', () => {
    for (const pen of QUIZ_PENS) {
      const answers = { goals: [pen.category], hooks: { [pen.category]: pen.id }, feelings: [...pen.feeling] };
      expect(results(answers)[0].id).toBe(pen.id);
    }
  });

  it('gives different matches for different answers in the same goal', () => {
    const goal = 'Weight & Body';
    const picks = pensIn(goal).map((p) => results({ goals: [goal], hooks: { [goal]: p.id }, feelings: [] })[0].id);
    expect(new Set(picks).size).toBe(pensIn(goal).length);
  });

  it('lets feelings pull the match across goals', () => {
    const a = 'Weight & Body';
    const b = 'Energy, Sleep & Recovery';
    const base = { goals: [a, b], hooks: { [a]: 'total-body-reset', [b]: 'deep-sleep-rebuild' } };
    expect(results({ ...base, feelings: ['Rested', 'Rebuilt'] })[0].id).toBe('deep-sleep-rebuild');
    expect(results({ ...base, feelings: ['More in control', 'Less stuck'] })[0].id).toBe('total-body-reset');
  });

  it('asks a tie-breaker when the top two are close, and it settles them', () => {
    const a = 'Weight & Body';
    const b = 'Hormones, Intimacy & Mind';
    const answers = { goals: [a, b], hooks: { [a]: 'craving-control', [b]: 'gut-reset' }, feelings: ['Less preoccupied'] };
    const pair = tiebreakPair(answers);
    expect(pair?.map((p) => p.id).sort()).toEqual(['craving-control', 'gut-reset']);
    expect(results({ ...answers, tiebreak: 'gut-reset' })[0].id).toBe('gut-reset');
    expect(tiebreakPair({ ...answers, tiebreak: 'gut-reset' })).toBeNull();
  });

  it('returns at most three pens and only offers feelings for the chosen goals', () => {
    const goals = CATEGORIES.slice(0, 2).map((c) => c.name);
    const feelings = feelingChoices(goals);
    expect(results({ goals, hooks: {}, feelings }).length).toBeLessThanOrEqual(MAX_RESULTS);
    const allowed = new Set(QUIZ_PENS.filter((p) => goals.includes(p.category)).flatMap((p) => p.feeling));
    expect(feelings.every((f) => allowed.has(f))).toBe(true);
  });
});
