/**
 * The two doors into PRICK. The women's side is the whole range, as it has
 * always been; the men's side shows only the pens chosen for men. Which door
 * someone took is remembered in this browser (see useSide).
 */
export type Side = 'women' | 'men';

export const SIDE_KEY = 'prick:side';

/** The men's range, in the order it leads. Change it here and every men's page follows. */
export const MEN_PENS = [
  'full-throttle',
  'rapid-recovery',
  'body-sculpt',
  'deep-sleep-rebuild',
  'hormone-reset',
  'bedroom-confidence',
  'age-defiance',
  'all-day-energy',
];

export function isForMen(slug: string): boolean {
  return MEN_PENS.includes(slug);
}

/** The pens this side shows: everything for women, the men's range for men. */
export function forSide<T>(items: T[], side: Side | null, slugOf: (item: T) => string): T[] {
  return side === 'men' ? items.filter((i) => isForMen(slugOf(i))) : items;
}

/** The men's homepage goal cards: colour and a pen instead of a photo. Each opens the quiz like the women's cards. */
export const MEN_GOALS = [
  { slug: 'energy', title: 'Recover harder.', covers: 'Recovery, energy and deeper sleep', pen: 'rapid-recovery', colour: '#14365f' },
  { slug: 'hormones', title: 'Get your drive back.', covers: 'Hormones, libido and drive', pen: 'hormone-reset', colour: '#2b2f36' },
  { slug: 'weight', title: 'Lean out.', covers: 'Body shape and composition', pen: 'body-sculpt', colour: '#1f6fff' },
];

/**
 * A pen told the men's way: same pen, same facts, a different angle on the
 * men's side (html[data-side="men"]). Feeling only, never a medical claim.
 */
export interface MenAngle {
  hook: string;
  outcome: string;
  feeling: string[];
}

export const MEN_ANGLES: Record<string, MenAngle> = {
  'deep-sleep-rebuild': {
    hook: 'Recover in your sleep. Build while you rest.',
    outcome: 'A sleep-and-recovery pen for men who train: deeper rest, faster bounce-back, and mornings you wake up ready for.',
    feeling: ['Rested', 'Recovered', 'Ready'],
  },
};
