/**
 * The first decision on the homepage: what she wants, before any pen.
 * One card per range category; each opens the quiz with that goal chosen.
 * Photos are AI-generated in Canva (decoration only, never a result).
 */
export interface Goal {
  /** URL value for /find-your-prick?goal=… */
  slug: string;
  /** Range category this goal maps to. */
  category: string;
  /** Big line on the card. */
  title: string;
  /** What it covers, in plain words. */
  covers: string;
  image: string;
  /** Tint behind the photo while it loads, and the arrow colour. */
  colour: string;
  /** Where they're heading, as it reads in a sentence: "the road to your glow". */
  destination: string;
  /** The picture-it line on the first screening stop. */
  picture: string;
  /** An example answer for "What's different when it's working?". */
  visionExample: string;
  /** Questionnaire goals this destination starts with ticked. */
  intakeGoals: string[];
}

export const GOALS: Goal[] = [
  {
    slug: 'weight',
    category: 'Weight & Body',
    title: 'Lose the weight.',
    covers: 'Weight loss, cravings and body shape',
    image: '/goals/weight.jpg',
    colour: '#FF6A21',
    destination: 'your goal weight',
    picture: 'Your clothes fit the way you want. The scale isn’t the first thing you think about every morning.',
    visionExample: 'I get dressed without overthinking it.',
    intakeGoals: ['Weight management'],
  },
  {
    slug: 'skin',
    category: 'Appearance & Skin',
    title: 'Get the glow.',
    covers: 'Glass skin, glow and fresher-looking skin',
    image: '/goals/skin.jpg',
    colour: '#FF0F78',
    destination: 'your glow',
    picture: 'You catch your reflection and you actually like what you see. No filter needed.',
    visionExample: 'I leave the house without foundation and feel good.',
    intakeGoals: ['Skin and appearance'],
  },
  {
    slug: 'energy',
    category: 'Energy, Sleep & Recovery',
    title: 'Sleep. Recover. Repeat.',
    covers: 'Energy, deeper sleep and faster recovery',
    image: '/goals/energy.jpg',
    colour: '#1267E8',
    destination: 'better energy, sleep and recovery',
    picture: 'You wake up before the alarm. You get through the afternoon, and back to the things you love.',
    visionExample: 'I wake up rested and I’m back at gym.',
    intakeGoals: ['Energy','Sleep','Recovery'],
  },
  {
    slug: 'hormones',
    category: 'Hormones, Intimacy & Mind',
    title: 'Feel like you again.',
    covers: 'Hormones, libido, mood and focus',
    image: '/goals/hormones.jpg',
    colour: '#8E1F5D',
    destination: 'feeling like you again',
    picture: 'Your mood is steady, your drive is back, and you feel like yourself again.',
    visionExample: 'I have energy for my partner again.',
    intakeGoals: ['Hormones'],
  },
];

export function goalBySlug(slug: string | undefined): Goal | undefined {
  return GOALS.find((g) => g.slug === slug);
}

/** The goal a range category belongs to. */
export function goalForCategory(category: string | undefined): Goal | undefined {
  return GOALS.find((g) => g.category === category);
}
