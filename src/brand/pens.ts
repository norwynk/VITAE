/**
 * PRICK brand presentation for each product, from the character sheet in
 * `range.json`, keyed by catalogue slug.
 *
 * Presentation only: colour and the emotional copy the brand supplied. Product
 * facts (name, peptide, price, availability, approval rules) always come from
 * the catalogue via the repository. Never add dosing or invented claims here.
 */
import type { Treatment } from '@/domain/model';
import RANGE from './range.json';

export interface PenColours {
  /** Casing / hero colour. */
  main: string;
  /** Shadowed side of the casing, bands and cap. */
  deep: string;
  /** Highlight on the casing. */
  light: string;
  /** Pale tint for quiet backgrounds. */
  tint: string;
  /** Text that sits on `main`. */
  ink: string;
  /** Solid button colour on `main` that keeps white text readable. */
  strong: string;
}

export interface PenBrand {
  slug: string;
  /** Label printed on the pen. */
  penLabel: string;
  category: string;
  colours: PenColours;
  hook: string;
  whatItIs: string;
  outcome: string;
  feeling: string;
  transformation: string;
  cardBack: string;
  benefits: string[];
}

// ---------------------------------------------------------------------------
// Colour derivation
// ---------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, other: string, t: number): string {
  const a = rgb(hex);
  const b = rgb(other);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK_DARK = '#141414';

export function coloursFor(hero: string): PenColours {
  const contrastWhite = 1.05 / (luminance(hero) + 0.05);
  const contrastDark = (luminance(hero) + 0.05) / (luminance(INK_DARK) + 0.05);
  const ink = contrastWhite >= contrastDark ? '#ffffff' : INK_DARK;
  const deep = mix(hero, '#000000', 0.3);
  return {
    main: hero,
    deep,
    light: mix(hero, '#ffffff', 0.38),
    tint: mix(hero, '#ffffff', 0.86),
    ink,
    strong: ink === '#ffffff' ? mix(hero, '#000000', 0.42) : INK_DARK,
  };
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

export const PEN_BRANDS: Record<string, PenBrand> = Object.fromEntries(
  RANGE.products.map((p) => [
    p.id,
    {
      slug: p.id,
      penLabel: p.name.toUpperCase(),
      category: p.category,
      colours: coloursFor(p.hero_colour),
      hook: p.front_hook,
      whatItIs: p.what_it_is,
      outcome: p.outcome,
      feeling: p.feeling,
      transformation: p.transformation,
      cardBack: p.card_back_copy,
      benefits: p.short_benefit_lines,
    } satisfies PenBrand,
  ]),
);

/** Neutral identity for catalogue items without a character-sheet entry yet. */
export function penBrand(treatment: Pick<Treatment, 'slug' | 'name' | 'category' | 'summary'>): PenBrand {
  return (
    PEN_BRANDS[treatment.slug] ?? {
      slug: treatment.slug,
      penLabel: treatment.name.toUpperCase(),
      category: treatment.category,
      colours: coloursFor('#2a2a2e'),
      hook: 'New in. Details coming soon.',
      whatItIs: treatment.summary,
      outcome: 'Details coming soon.',
      feeling: 'Details coming soon.',
      transformation: 'Details coming soon.',
      cardBack: treatment.summary,
      benefits: [],
    }
  );
}

/** Character-sheet order; unknown products follow alphabetically. */
export const RANGE_ORDER = RANGE.products.map((p) => p.id);

export function sortRange<T extends Pick<Treatment, 'slug' | 'name'>>(items: T[]): T[] {
  const rank = (slug: string) => {
    const i = RANGE_ORDER.indexOf(slug);
    return i === -1 ? RANGE_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));
}

/** Shop filters and quiz first step, in character-sheet order. */
export const CATEGORIES: { name: string; choice: string; colour: string }[] = [
  { name: 'Weight & Body', choice: 'I want to change my body', colour: PEN_BRANDS['total-body-reset'].colours.main },
  { name: 'Appearance & Skin', choice: 'I want to love what I see', colour: PEN_BRANDS['the-glow-up'].colours.main },
  { name: 'Energy, Sleep & Recovery', choice: 'I want more energy, sleep or recovery', colour: PEN_BRANDS['deep-sleep-rebuild'].colours.main },
  { name: 'Hormones, Intimacy & Mind', choice: 'I want to feel more like me', colour: PEN_BRANDS['sharp-mind'].colours.main },
];
