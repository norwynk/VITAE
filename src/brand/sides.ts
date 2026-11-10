/**
 * The two doors into PRICK. The women's side is the whole range, as it has
 * always been; the men's side shows only the pens chosen for men. Which door
 * someone took is remembered in this browser (see useSide).
 */
import type { Goal } from './goals';
import { type PenBrand, PEN_BRANDS, coloursFor } from './pens';
import { type Side, goalForSide } from './side';

export { SIDE_KEY, MEN_GOALS, goalForSide } from './side';
export type { Side } from './side';

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
  /** Its screening story: what it's heading for, and an example answer. */
  destination: string;
  example: string;
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
    destination: 'your drive and strength',
    example: 'I walk into the gym like I own it.',
  },
  'rapid-recovery': {
    hook: 'Train hard. Bounce back harder.',
    outcome: 'A recovery pen for men who train: for the strains, niggles and sore joints that keep pulling you out of the gym.',
    feeling: ['Recovered', 'Unstoppable', 'Back under the bar'],
    transformation: 'From training around the injury to lifting at full weight again.',
    help: ['Recovery', 'Muscle and strength'],
    destination: 'faster recovery',
    example: 'I train hard again the next day and my body keeps up.',
  },
  'body-sculpt': {
    hook: 'Leaner. Harder. Built to be noticed.',
    outcome: 'A body-composition pen for men who train and want it to show: less of the soft middle, more of the shape you have been building.',
    feeling: ['Lean', 'Defined', 'Noticed'],
    transformation: 'From training hard and still hiding it under a soft middle, to a body people notice when you walk in.',
    colour: '#2B4C7E',
    help: ['Fat loss and definition', 'Muscle and strength'],
    destination: 'the body you’re building',
    example: 'My shirts are tighter in the arms and looser at the waist.',
  },
  'deep-sleep-rebuild': {
    hook: 'Recover in your sleep. Build while you rest.',
    outcome: 'A sleep-and-recovery pen for men who train: deeper sleep, faster bounce-back, and more out of every session.',
    feeling: ['Rested', 'Recovered', 'Ready'],
    transformation: 'From lying awake and dragging yourself to the gym, to waking up recovered and ready to lift.',
    help: ['Sleep', 'Recovery', 'Muscle and strength'],
    destination: 'recovery while you sleep',
    example: 'I’m lifting heavier and I’m not wrecked the next day.',
  },
  'hormone-reset': {
    hook: 'Get your edge back.',
    outcome: 'A hormone pen for men who feel flat: for the drive, mood and hunger you used to take for granted.',
    feeling: ['Sharp', 'Hungry', 'Myself again'],
    transformation: 'From going through the motions to switched on, sharp and hungry again.',
    help: ['Testosterone and drive'],
    destination: 'getting your edge back',
    example: 'I’ve got my drive back, and my partner has noticed.',
  },
  'bedroom-confidence': {
    hook: 'Bring the heat back.',
    outcome: 'For men who want the desire and the confidence back in the bedroom.',
    feeling: ['Confident', 'Wanted', 'Up for it'],
    transformation: 'From avoiding the moment to walking into it with confidence.',
    help: ['Libido'],
    destination: 'confidence in the bedroom',
    example: 'Things are good in the bedroom again, and my partner has noticed.',
  },
  'age-defiance': {
    hook: 'Older. Not slower.',
    outcome: 'A vitality pen for men who refuse to slow down: for the gym, the work and everything after.',
    feeling: ['Vital', 'Sharp', 'Still in the game'],
    transformation: 'From feeling the years in every session to keeping pace with men half your age.',
    help: ['Energy', 'General wellbeing'],
    destination: 'staying strong as you age',
    example: 'I’m keeping up with guys half my age.',
  },
  'all-day-energy': {
    hook: 'Still got gas in the tank at 9pm.',
    outcome: 'An energy pen for men who want more in the tank: for work, for training, and still something left after.',
    feeling: ['Switched on', 'Strong', 'Still going'],
    transformation: 'From crashing at 3pm to finishing the day with energy to spare.',
    help: ['Energy'],
    destination: 'energy that lasts',
    example: 'I’ve still got gas in the tank at 9pm.',
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

/** The screening told by the pen they lead with: its headline, its why and its example answer, on their side. */
export function goalForPen(goal: Goal, slug: string | undefined, side: Side | null): Goal {
  const sided = goalForSide(goal, side);
  const men = side === 'men' ? MEN_ANGLES[slug ?? ''] : undefined;
  const story = men ?? PEN_STORY[slug ?? ''];
  if (!story) return sided;
  const title = men?.hook ?? PEN_BRANDS[slug ?? '']?.hook ?? sided.title;
  return { ...sided, title, destination: story.destination, visionExample: story.example };
}

/** What each pen helps with, as the women's side answers "What would you like help with?". */
export const PEN_HELP: Record<string, string[]> = {
  'craving-control': ['Weight management'],
  'slow-and-steady': ['Weight management'],
  momentum: ['Weight management'],
  'body-sculpt': ['Body shape'],
  'the-glow-up': ['Skin and appearance'],
  'skin-rewind': ['Skin and appearance'],
  'skin-rewind-reserve': ['Skin and appearance'],
  'holiday-tan': ['Skin and appearance'],
  'all-day-energy': ['Energy'],
  'deep-sleep-rebuild': ['Sleep', 'Recovery'],
  'rapid-recovery': ['Recovery'],
  'full-throttle': ['Testosterone and drive'],
  'age-defiance': ['Energy', 'General wellbeing'],
  'hormone-reset': ['Hormones'],
  'bedroom-confidence': ['Libido'],
  'sharp-mind': ['Focus'],
  'gut-reset': ['Gut health'],
};

/** Each pen's own story in the screening, women's side: what it's heading for, and an example answer. */
export const PEN_STORY: Record<string, { destination: string; example: string }> = {
  'craving-control': { destination: 'quieter cravings', example: 'I walk past the biscuit tin and don’t even notice it.' },
  'slow-and-steady': { destination: 'your goal weight', example: 'I get dressed without overthinking it.' },
  momentum: { destination: 'your goal weight', example: 'The scale is moving again, and so am I.' },
  'body-sculpt': { destination: 'a shape you love', example: 'My jeans sit right and I want to be seen in them.' },
  'the-glow-up': { destination: 'your glow', example: 'People keep asking what I’m doing to my skin.' },
  'skin-rewind': { destination: 'younger-looking skin', example: 'I leave the house without foundation and feel good.' },
  'skin-rewind-reserve': { destination: 'younger-looking skin', example: 'My skin looks rested, even when I’m not.' },
  'holiday-tan': { destination: 'your holiday glow', example: 'I look like I’ve just come back from somewhere warm.' },
  'all-day-energy': { destination: 'all-day energy', example: 'I’ve still got energy for me at 9pm.' },
  'deep-sleep-rebuild': { destination: 'deep, restful sleep', example: 'I wake up before the alarm, looking rested.' },
  'rapid-recovery': { destination: 'faster recovery', example: 'I train again the next day and my body keeps up.' },
  'full-throttle': { destination: 'your drive and energy', example: 'I get through a full day with energy to spare.' },
  'age-defiance': { destination: 'ageing on your terms', example: 'I feel younger than the number on my ID.' },
  'hormone-reset': { destination: 'feeling like you again', example: 'My moods are steady and I feel like me again.' },
  'bedroom-confidence': { destination: 'getting your spark back', example: 'I want my partner again, and they’ve noticed.' },
  'sharp-mind': { destination: 'a clearer head', example: 'I get through my to-do list without the fog.' },
  'gut-reset': { destination: 'a calmer gut', example: 'I eat out without worrying about the bloat.' },
};
