/**
 * The two doors into PRICK. The women's side is the whole range, as it has
 * always been; the men's side shows only the pens chosen for men. Which door
 * someone took is remembered in this browser (see useSide).
 */
import type { Goal } from './goals';
import { type PenBrand, coloursFor } from './pens';

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
  { slug: 'energy', title: 'Recover harder. Train harder.', covers: 'Recovery, deeper sleep and energy for every session', pen: 'rapid-recovery', colour: '#14365f' },
  { slug: 'hormones', title: 'Back in your prime.', covers: 'Hormones, drive and desire', pen: 'hormone-reset', colour: '#2b2f36' },
  { slug: 'weight', title: 'Get lean. Look built.', covers: 'Definition, shape and the body you train for', pen: 'body-sculpt', colour: '#1f6fff' },
];

/**
 * A pen told the men's way: same pen, same facts, a different angle on the
 * men's side (html[data-side="men"]). Written to what men are actually after
 * (to look good, get stronger, recover, feel like the man they were), framed
 * as who the pen is for rather than as a promise of results.
 */
export interface MenAngle {
  hook: string;
  outcome: string;
  feeling: string[];
  transformation: string;
  /** What it helps with, as the men's side answers "What would you like help with?". */
  help: string[];
  /** Its own colour on the men's side (the painted card replaces the photo). */
  colour?: string;
}

export const MEN_ANGLES: Record<string, MenAngle> = {
  'full-throttle': {
    hook: 'Walk in like you own the place.',
    outcome: 'Testosterone replacement for men whose levels are low, with a clinician and regular blood tests behind every dose.',
    feeling: ['Driven', 'Strong', 'Back in charge'],
    transformation: 'From running on empty, flat in the gym and flat at home, to feeling like the man you know you are.',
    help: ['Testosterone and drive', 'Muscle and strength'],
  },
  'rapid-recovery': {
    hook: 'Train hard. Bounce back harder.',
    outcome: 'A recovery pen for men who train: for the strains, niggles and sore joints that keep pulling you out of the gym.',
    feeling: ['Recovered', 'Unstoppable', 'Back under the bar'],
    transformation: 'From training around the injury to lifting at full weight again.',
    help: ['Recovery', 'Muscle and strength'],
  },
  'body-sculpt': {
    hook: 'Leaner. Harder. Built to be noticed.',
    outcome: 'A body-composition pen for men who train and want it to show: less of the soft middle, more of the shape you have been building.',
    feeling: ['Lean', 'Defined', 'Noticed'],
    transformation: 'From training hard and still hiding it under a soft middle, to a body people notice when you walk in.',
    colour: '#2B4C7E',
    help: ['Fat loss and definition', 'Muscle and strength'],
  },
  'deep-sleep-rebuild': {
    hook: 'Recover in your sleep. Build while you rest.',
    outcome: 'A sleep-and-recovery pen for men who train: deeper sleep, faster bounce-back, and more out of every session.',
    feeling: ['Rested', 'Recovered', 'Ready'],
    transformation: 'From lying awake and dragging yourself to the gym, to waking up recovered and ready to lift.',
    help: ['Sleep', 'Recovery', 'Muscle and strength'],
  },
  'hormone-reset': {
    hook: 'Get your edge back.',
    outcome: 'A hormone pen for men who feel flat: for the drive, mood and hunger you used to take for granted.',
    feeling: ['Sharp', 'Hungry', 'Myself again'],
    transformation: 'From going through the motions to switched on, sharp and hungry again.',
    help: ['Testosterone and drive'],
  },
  'bedroom-confidence': {
    hook: 'Bring the heat back.',
    outcome: 'For men who want the desire and the confidence back in the bedroom.',
    feeling: ['Confident', 'Wanted', 'Up for it'],
    transformation: 'From avoiding the moment to walking into it with confidence.',
    help: ['Libido'],
  },
  'age-defiance': {
    hook: 'Older. Not slower.',
    outcome: 'A vitality pen for men who refuse to slow down: for the gym, the work and everything after.',
    feeling: ['Vital', 'Sharp', 'Still in the game'],
    transformation: 'From feeling the years in every session to keeping pace with men half your age.',
    help: ['Energy', 'General wellbeing'],
  },
  'all-day-energy': {
    hook: 'Still got gas in the tank at 9pm.',
    outcome: 'An energy pen for men who want more in the tank: for work, for training, and still something left after.',
    feeling: ['Switched on', 'Strong', 'Still going'],
    transformation: 'From crashing at 3pm to finishing the day with energy to spare.',
    help: ['Energy'],
  },
};

/** The quiz's "What are you after?" answers, the men's way. Keyed by category. */
export const MEN_CHOICES: Record<string, string> = {
  'Weight & Body': 'I want a leaner, stronger body',
  'Energy, Sleep & Recovery': 'I want to recover faster and train harder',
  'Hormones, Intimacy & Mind': 'I want my drive and edge back',
};

/** A pen as the men's side shows it: its men's colour, painted rather than photographed. */
export function forMen(brand: PenBrand): PenBrand {
  const colour = MEN_ANGLES[brand.slug]?.colour;
  return colour ? { ...brand, colours: coloursFor(colour), botanical: 'leaf', cardImage: undefined } : brand;
}

/**
 * Where a man is heading, in his words: the screening's destination, the
 * "Picture it" line and the example answer. No photos on the men's side.
 */
const MEN_GOAL_STORY: Record<string, Pick<Goal, 'destination' | 'picture' | 'visionExample' | 'intakeGoals'>> = {
  energy: {
    destination: 'harder training and faster recovery',
    picture: 'You wake up recovered. You train heavier, bounce back quicker, and it shows.',
    visionExample: 'I’m lifting heavier and I’m not wrecked the next day.',
    intakeGoals: ['Recovery', 'Sleep', 'Muscle and strength'],
  },
  hormones: {
    destination: 'your edge back',
    picture: 'Your drive is back: in the gym, at work, at home. You feel like the man you know you are.',
    visionExample: 'I’ve got my drive back, and my partner has noticed.',
    intakeGoals: ['Testosterone and drive'],
  },
  weight: {
    destination: 'the body you’re building',
    picture: 'You catch yourself in the gym mirror and like what you see. So do they.',
    visionExample: 'My shirts are tighter in the arms and looser at the waist.',
    intakeGoals: ['Fat loss and definition', 'Muscle and strength'],
  },
};

/** A goal as this side tells it: the men's title, story and colour, and no photo. */
export function goalForSide(goal: Goal, side: Side | null): Goal {
  const card = side === 'men' ? MEN_GOALS.find((g) => g.slug === goal.slug) : undefined;
  if (!card) return goal;
  return { ...goal, ...MEN_GOAL_STORY[goal.slug], title: card.title, covers: card.covers, colour: card.colour, image: '' };
}
