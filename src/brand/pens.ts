/**
 * PRICK brand presentation: Layer 1 (desire) and Layer 2 (transformation)
 * from the character sheet, keyed by catalogue slug.
 *
 * These layers describe how people want to feel. They are never medical
 * claims and never carry product facts: ingredients, strength, evidence and
 * clinical information live on the catalogue record (Layers 3 and 4).
 */
import type { Treatment } from '@/domain/model';
import RANGE from './range.json';
import { type Botanical, type PenColours, coloursFor } from './colours';

export { coloursFor };
export type { Botanical, PenColours };

export interface PenBrand {
  slug: string;
  /** Label printed on the pen. */
  penLabel: string;
  category: string;
  colours: PenColours;
  // Layer 1: desire
  hook: string;
  outcome: string;
  // Layer 2: transformation
  feeling: string[];
  transformation: string;
  /** Customer-facing benefit statements. Empty means NEEDS VERIFICATION. */
  benefits: string[];
  botanical: Botanical;
  /** Card photograph (public path). Falls back to the painted card when absent. */
  cardImage?: string;
  /** Made only for men: tagged "For him" on the women's side (the men's side needs no tag). */
  forHim?: boolean;
}

/** "Free. In control. Lighter." */
export function feelingLine(brand: Pick<PenBrand, 'feeling'>): string {
  return brand.feeling.map((f) => `${f}.`).join(' ');
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

/** Art direction only: which painted motif each pen wears. */
const BOTANICALS: Record<string, Botanical> = {
  'craving-control': 'berry',
  'body-sculpt': 'lavender',
  'slow-and-steady': 'daisy',
  momentum: 'blossom',
  'the-glow-up': 'blossom',
  'skin-rewind': 'daisy',
  'skin-rewind-reserve': 'lavender',
  'holiday-tan': 'citrus',
  'all-day-energy': 'citrus',
  'deep-sleep-rebuild': 'lavender',
  'rapid-recovery': 'leaf',
  'full-throttle': 'leaf',
  'age-defiance': 'blossom',
  'hormone-reset': 'blossom',
  'bedroom-confidence': 'berry',
  'sharp-mind': 'leaf',
  'gut-reset': 'daisy',
};

/** Card photographs (AI-generated in Canva), served from public/cards. Decoration only. */
const CARD_IMAGES: Record<string, string> = {
  'craving-control': '/cards/craving-control.jpg',
  'body-sculpt': '/cards/body-sculpt.jpg',
  'the-glow-up': '/cards/the-glow-up.jpg',
  'skin-rewind': '/cards/skin-rewind.jpg',
  'skin-rewind-reserve': '/cards/skin-rewind-reserve.jpg',
  'holiday-tan': '/cards/holiday-tan.jpg',
  'all-day-energy': '/cards/all-day-energy.jpg',
  'deep-sleep-rebuild': '/cards/deep-sleep-rebuild.jpg',
  'rapid-recovery': '/cards/rapid-recovery.jpg',
  'age-defiance': '/cards/age-defiance.jpg',
  'hormone-reset': '/cards/hormone-reset.jpg',
  'bedroom-confidence': '/cards/bedroom-confidence.jpg',
  'sharp-mind': '/cards/sharp-mind.jpg',
  'gut-reset': '/cards/gut-reset.jpg',
};

export const PEN_BRANDS: Record<string, PenBrand> = Object.fromEntries(
  RANGE.products.map((p) => [
    p.id,
    {
      slug: p.id,
      penLabel: p.name.toUpperCase(),
      category: p.category,
      colours: coloursFor(p.hero_colour),
      hook: p.front_hook,
      outcome: p.one_line_outcome,
      feeling: p.feeling,
      transformation: p.transformation,
      // The sheet supplies no benefit statements yet; never write our own.
      benefits: [],
      botanical: BOTANICALS[p.id] ?? 'leaf',
      cardImage: CARD_IMAGES[p.id],
      forHim: 'for_him' in p && p.for_him === true,
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
      hook: treatment.summary,
      outcome: treatment.summary,
      feeling: [],
      transformation: '',
      benefits: [],
      botanical: 'leaf',
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
  { name: 'Weight & Body', choice: 'I want to feel incredible in my body', colour: '#FF6A21' },
  { name: 'Appearance & Skin', choice: 'I want to love what I see', colour: PEN_BRANDS['the-glow-up'].colours.main },
  { name: 'Energy, Sleep & Recovery', choice: 'I want my energy and spark back', colour: PEN_BRANDS['deep-sleep-rebuild'].colours.main },
  { name: 'Hormones, Intimacy & Mind', choice: 'I want to feel like me again', colour: PEN_BRANDS['sharp-mind'].colours.main },
];
