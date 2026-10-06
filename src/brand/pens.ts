/**
 * PRICK brand presentation for each product, keyed by catalogue slug.
 *
 * Presentation only: colour, mood and marketing lines. Product facts (name,
 * price, availability, approval rules) always come from the catalogue via the
 * repository. Never put ingredients, dosing or medical claims here.
 */
import type { Treatment } from '@/domain/model';

export type GoalKey = 'glow' | 'energy' | 'sleep' | 'sharper' | 'recover';

export interface PenColours {
  /** Casing / hero colour. */
  main: string;
  /** Shadowed side of the casing. */
  deep: string;
  /** Highlight on the casing. */
  light: string;
  /** Pale tint for backgrounds behind the pen. */
  tint: string;
  /** Text that sits on `main`. */
  ink: string;
}

export interface PenBrand {
  slug: string;
  /** Short label printed on the pen, e.g. "GLOW UP". */
  penLabel: string;
  colourName: string;
  colours: PenColours;
  goals: GoalKey[];
  /** Outcome-first shop label. */
  goalLabel: string;
  /** Two-line launch statement for the product page. */
  statement: [string, string];
  /** One-liner for cards. */
  line: string;
  /** Art direction for photography; shown only in development placeholders. */
  world: string;
}

export const PEN_BRANDS: Record<string, PenBrand> = {
  'the-glow-up': {
    slug: 'the-glow-up',
    penLabel: 'GLOW UP',
    colourName: 'Prick Pink',
    colours: { main: '#ff2d8a', deep: '#b8005a', light: '#ff8cc0', tint: '#ffe3ef', ink: '#ffffff' },
    goals: ['glow'],
    goalLabel: 'Look better',
    statement: ['Your skin called.', 'It wants better lighting.'],
    line: 'For the days you want to shine a little louder.',
    world: 'Pink pen on halved grapefruit and hibiscus, water droplets, hard midday sun, glossy reflections.',
  },
  'total-body-reset': {
    slug: 'total-body-reset',
    penLabel: 'BODY RESET',
    colourName: 'Reset Orange',
    colours: { main: '#ff7a1a', deep: '#c24a00', light: '#ffb070', tint: '#ffead9', ink: '#ffffff' },
    goals: ['energy', 'recover'],
    goalLabel: 'Feel better',
    statement: ['Same you.', 'More get-up-and-go.'],
    line: 'For mornings that start before the alarm wins.',
    world: 'Orange pen with peaches and blood oranges, warm late-afternoon sun, long hard shadows on stone.',
  },
  'deep-sleep-rebuild': {
    slug: 'deep-sleep-rebuild',
    penLabel: 'DEEP SLEEP',
    colourName: 'Sleep Blue',
    colours: { main: '#2e4bff', deep: '#1424a8', light: '#7f93ff', tint: '#e2e7ff', ink: '#ffffff' },
    goals: ['sleep'],
    goalLabel: 'Sleep deeper',
    statement: ['Lights out.', 'Properly, this time.'],
    line: 'For nights that actually feel like nights.',
    world: 'Blue pen on cool linen with lavender sprigs, dusk light, soft blue shadows, a glass of iced water.',
  },
  'sharp-mind': {
    slug: 'sharp-mind',
    penLabel: 'SHARP MIND',
    colourName: 'Mind Lime',
    colours: { main: '#a8e61d', deep: '#5f8f00', light: '#d6ff7a', tint: '#f1fbd9', ink: '#132000' },
    goals: ['sharper'],
    goalLabel: 'Think sharper',
    statement: ['Clear head.', 'Full calendar.'],
    line: 'For when the to-do list has a to-do list.',
    world: 'Lime pen with sliced limes and green leaves, clean bright daylight, chrome desk objects, crisp shadows.',
  },
};

/** Neutral identity for catalogue items that don't have a brand entry yet. */
const FALLBACK: Omit<PenBrand, 'slug' | 'penLabel'> = {
  colourName: 'Studio Black',
  colours: { main: '#1d1d1f', deep: '#000000', light: '#5a5a60', tint: '#efebe4', ink: '#ffffff' },
  goals: [],
  goalLabel: 'More good days',
  statement: ['New in.', 'Details coming soon.'],
  line: 'A new pen is on its way.',
  world: 'Black pen on warm stone, hard flash, chrome accents.',
};

export function penBrand(treatment: Pick<Treatment, 'slug' | 'name'>): PenBrand {
  return PEN_BRANDS[treatment.slug] ?? { ...FALLBACK, slug: treatment.slug, penLabel: treatment.name.toUpperCase() };
}

/** Display order of the range; unknown products follow. */
export const RANGE_ORDER = ['the-glow-up', 'total-body-reset', 'deep-sleep-rebuild', 'sharp-mind'];

export function sortRange<T extends Pick<Treatment, 'slug' | 'name'>>(items: T[]): T[] {
  const rank = (slug: string) => {
    const i = RANGE_ORDER.indexOf(slug);
    return i === -1 ? RANGE_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));
}

export const GOALS: { key: GoalKey; choice: string; filter: string; colour: string }[] = [
  { key: 'glow', choice: 'I want to glow', filter: 'Look better', colour: PEN_BRANDS['the-glow-up'].colours.main },
  { key: 'energy', choice: 'I want more energy', filter: 'Feel better', colour: PEN_BRANDS['total-body-reset'].colours.main },
  { key: 'sleep', choice: 'I want better sleep', filter: 'Sleep deeper', colour: PEN_BRANDS['deep-sleep-rebuild'].colours.main },
  { key: 'sharper', choice: 'I want to feel sharper', filter: 'Think sharper', colour: PEN_BRANDS['sharp-mind'].colours.main },
  { key: 'recover', choice: 'I want to recover faster', filter: 'Recover faster', colour: PEN_BRANDS['total-body-reset'].colours.deep },
];

/** Consumer recommendation only. It never changes clinical eligibility. */
export function matchForGoal<T extends Pick<Treatment, 'slug' | 'name'>>(goal: GoalKey, catalogue: T[]): T | undefined {
  return sortRange(catalogue).find((t) => penBrand(t).goals.includes(goal));
}
