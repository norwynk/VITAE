/**
 * The two doors into PRICK and what each side's goal cards say. Public pages
 * import this, so nothing about any treatment may ever be added here.
 */
import type { Goal } from './goals';

export type Side = 'women' | 'men';

export const SIDE_KEY = 'prick:side';

/** The men's homepage goal cards: colour instead of a photo. */
export const MEN_GOALS = [
  { slug: 'energy', title: 'Slower to bounce back.', covers: 'Recovery, sleep and energy', colour: '#14365f' },
  { slug: 'hormones', title: 'Flat. In every sense.', covers: 'Hormones, drive and mood', colour: '#2b2f36' },
  { slug: 'weight', title: 'Training hard. Not showing.', covers: 'Body composition and weight', colour: '#1f6fff' },
];

/** What's going on, in a man's words. No photos on the men's side. */
const MEN_GOAL_STORY: Record<string, Pick<Goal, 'destination' | 'picture' | 'visionExample' | 'intakeGoals'>> = {
  energy: {
    destination: 'getting clear on your recovery',
    picture: 'You stop blaming your age. A doctor looks at what’s actually happening.',
    visionExample: 'I want to stop feeling wrecked the next day.',
    intakeGoals: ['Recovery', 'Sleep', 'Muscle and strength'],
  },
  hormones: {
    destination: 'getting clear on your hormones and drive',
    picture: 'You say out loud what you’ve been keeping to yourself. A doctor doesn’t flinch.',
    visionExample: 'I want to feel like myself.',
    intakeGoals: ['Testosterone and drive'],
  },
  weight: {
    destination: 'getting clear on your body',
    picture: 'You stop guessing from the internet. A doctor looks at you.',
    visionExample: 'I want to know why the work isn’t showing.',
    intakeGoals: ['Fat loss and definition', 'Muscle and strength'],
  },
};

/** A goal as this side tells it: the men's title, story and colour, and no photo. */
export function goalForSide(goal: Goal, side: Side | null): Goal {
  const card = side === 'men' ? MEN_GOALS.find((g) => g.slug === goal.slug) : undefined;
  if (!card) return goal;
  return { ...goal, ...MEN_GOAL_STORY[goal.slug], title: card.title, covers: card.covers, colour: card.colour, image: '' };
}
