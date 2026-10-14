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
}

export const GOALS: Goal[] = [
  {
    slug: 'weight',
    category: 'Weight & Body',
    title: 'Lose the weight.',
    covers: 'Weight loss, cravings and body shape',
    image: '/goals/weight.jpg',
    colour: '#FF6A21',
  },
  {
    slug: 'skin',
    category: 'Appearance & Skin',
    title: 'Get the glow.',
    covers: 'Glass skin, glow and fresher-looking skin',
    image: '/goals/skin.jpg',
    colour: '#FF0F78',
  },
  {
    slug: 'energy',
    category: 'Energy, Sleep & Recovery',
    title: 'Sleep. Recover. Repeat.',
    covers: 'Energy, deeper sleep and faster recovery',
    image: '/goals/energy.jpg',
    colour: '#1267E8',
  },
  {
    slug: 'hormones',
    category: 'Hormones, Intimacy & Mind',
    title: 'Feel like you again.',
    covers: 'Hormones, libido, mood and focus',
    image: '/goals/hormones.jpg',
    colour: '#8E1F5D',
  },
];

export function goalBySlug(slug: string | undefined): Goal | undefined {
  return GOALS.find((g) => g.slug === slug);
}
