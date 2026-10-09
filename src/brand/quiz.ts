/**
 * "Find your Prick" matching. A consumer recommendation only, built from the
 * character sheet's Layer 1 and 2 copy (category, front hook, feeling words,
 * outcome). It asks nothing about health: eligibility is the clinician's call.
 *
 * Skin Rewind Reserve is never recommended here; a higher strength is not a
 * "better" match. Its sibling's result points to it instead.
 */
import RANGE from './range.json';

export interface QuizPen {
  id: string;
  name: string;
  category: string;
  hook: string;
  outcome: string;
  feeling: string[];
}

export const RESERVE_ID = 'skin-rewind-reserve';

export const QUIZ_PENS: QuizPen[] = RANGE.products
  .filter((p) => p.id !== RESERVE_ID)
  .map((p) => ({ id: p.id, name: p.name, category: p.category, hook: p.front_hook, outcome: p.one_line_outcome, feeling: p.feeling }));

/** Pens whose result should also mention another pen the clinician may suggest. */
export const CLINICIAN_MAY_SUGGEST: Record<string, string> = { 'skin-rewind': RESERVE_ID };

export const MAX_GOALS = 2;
export const MAX_RESULTS = 3;

const WEIGHT = { goal: 2, hook: 6, feeling: 2, tiebreak: 3 } as const;
/** Top two within this many points need the tie-breaker question. */
export const TIE_MARGIN = 2;

export interface QuizAnswers {
  /** Category names, up to MAX_GOALS. */
  goals: string[];
  /** Pen chosen per goal in "which sounds most like you". */
  hooks: Record<string, string>;
  /** Feeling words chosen. */
  feelings: string[];
  /** Pen chosen in the tie-breaker, if it was asked. */
  tiebreak?: string;
}

export function pensIn(category: string): QuizPen[] {
  return QUIZ_PENS.filter((p) => p.category === category);
}

/** Feeling chips for the chosen goals, de-duplicated, in pen order. */
export function feelingChoices(goals: string[]): string[] {
  const seen = new Set<string>();
  for (const p of QUIZ_PENS) if (goals.includes(p.category)) for (const f of p.feeling) seen.add(f);
  return [...seen];
}

export interface Scored {
  pen: QuizPen;
  score: number;
}

export function score(answers: QuizAnswers): Scored[] {
  const hooks = new Set(Object.values(answers.hooks));
  const feelings = new Set(answers.feelings);
  return QUIZ_PENS.map((pen, order) => {
    let s = 0;
    if (answers.goals.includes(pen.category)) s += WEIGHT.goal;
    if (hooks.has(pen.id)) s += WEIGHT.hook;
    s += pen.feeling.filter((f) => feelings.has(f)).length * WEIGHT.feeling;
    if (answers.tiebreak === pen.id) s += WEIGHT.tiebreak;
    return { pen, score: s, order };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ pen, score: s }) => ({ pen, score: s }));
}

/** The two pens to compare when the top of the ranking is too close to call. */
export function tiebreakPair(answers: QuizAnswers): [QuizPen, QuizPen] | null {
  if (answers.tiebreak) return null;
  const [a, b] = score(answers);
  return a && b && a.score - b.score <= TIE_MARGIN ? [a.pen, b.pen] : null;
}

/** Top match first, then up to two more worth asking the clinician about. */
export function results(answers: QuizAnswers): QuizPen[] {
  return score(answers)
    .slice(0, MAX_RESULTS)
    .map((x) => x.pen);
}
