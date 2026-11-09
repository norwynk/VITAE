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
    title: 'The scale and you aren’t speaking.',
    covers: 'Weight, and how you feel in your body',
    image: '/goals/weight.jpg',
    colour: '#FF6A21',
    destination: 'getting clear on your weight',
    picture: 'You tell a doctor what’s really going on. No lecture. No judgement.',
    visionExample: 'I want to stop thinking about food all day.',
    intakeGoals: ['Weight management'],
  },
  {
    slug: 'skin',
    category: 'Appearance & Skin',
    title: 'The mirror’s being rude.',
    covers: 'Skin, and how you feel about it',
    image: '/goals/skin.jpg',
    colour: '#FF0F78',
    destination: 'getting clear on your skin',
    picture: 'You ask the questions you’ve been Googling at midnight. A doctor answers them.',
    visionExample: 'I want to feel good in my own skin.',
    intakeGoals: ['Skin and appearance'],
  },
  {
    slug: 'energy',
    category: 'Energy, Sleep & Recovery',
    title: 'Tired. All the time.',
    covers: 'Energy, sleep and recovery',
    image: '/goals/energy.jpg',
    colour: '#1267E8',
    destination: 'getting clear on your energy and sleep',
    picture: 'You stop saying you’re fine. A doctor takes tired seriously.',
    visionExample: 'I want to get through an afternoon.',
    intakeGoals: ['Energy','Sleep','Recovery'],
  },
  {
    slug: 'hormones',
    category: 'Hormones, Intimacy & Mind',
    title: 'You don’t feel like you.',
    covers: 'Hormones, mood and intimacy',
    image: '/goals/hormones.jpg',
    colour: '#8E1F5D',
    destination: 'getting clear on your hormones and mood',
    picture: 'You stop being told it’s just stress. A doctor actually looks.',
    visionExample: 'I want to feel like myself.',
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
