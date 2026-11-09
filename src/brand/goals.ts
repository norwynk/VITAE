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

export function goalBySlug(slug: string | undefined): Goal | undefined {
  return GOALS.find((g) => g.slug === slug);
}

/** The goal a range category belongs to. */
export function goalForCategory(category: string | undefined): Goal | undefined {
  return GOALS.find((g) => g.category === category);
}
