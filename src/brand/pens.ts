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
  /** Soft watercolour wash for the pen wrap and card backgrounds. */
  pastel: string;
  /** Very pale end of the wash. */
  mist: string;
  /** Companion hue for botanicals painted on the wrap. */
  accent: string;
  /** Dark, tinted ink that reads on the pastel wrap. */
  print: string;
}

/** Painted motif on the pen wrap and card (decoration only, never an ingredient). */
export type Botanical = 'blossom' | 'citrus' | 'lavender' | 'leaf' | 'berry' | 'daisy';

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
}

/** "Quieter. Calmer. Less preoccupied." */
export function feelingLine(brand: Pick<PenBrand, 'feeling'>): string {
  return brand.feeling.map((f) => `${f}.`).join(' ');
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

/** Rotates a colour's hue by `deg`, keeping saturation and lightness. */
function hueShift(hex: string, deg: number): string {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return hex;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

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
    pastel: mix(hero, '#ffffff', 0.55),
    mist: mix(hero, '#ffffff', 0.82),
    accent: hueShift(mix(hero, '#ffffff', 0.25), 38),
    print: mix(hero, '#1a1420', 0.78),
  };
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

/** Art direction only: which painted motif each pen wears. */
const BOTANICALS: Record<string, Botanical> = {
  'total-body-reset': 'citrus',
  'craving-control': 'berry',
  'body-sculpt': 'lavender',
  'the-glow-up': 'blossom',
  'skin-rewind': 'daisy',
  'skin-rewind-reserve': 'lavender',
  'holiday-tan': 'citrus',
  'all-day-energy': 'citrus',
  'deep-sleep-rebuild': 'lavender',
  'rapid-recovery': 'leaf',
  'age-defiance': 'blossom',
  'hormone-reset': 'blossom',
  'bedroom-confidence': 'berry',
  'sharp-mind': 'leaf',
  'gut-reset': 'daisy',
};

/** Card photographs, added as they're exported (public/cards/<slug>.jpg). */
const CARD_IMAGES: Record<string, string> = {};

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
  { name: 'Weight & Body', choice: 'I want to transform my body', colour: PEN_BRANDS['total-body-reset'].colours.main },
  { name: 'Appearance & Skin', choice: 'I want to love what I see', colour: PEN_BRANDS['the-glow-up'].colours.main },
  { name: 'Energy, Sleep & Recovery', choice: 'I want more energy, sleep or recovery', colour: PEN_BRANDS['deep-sleep-rebuild'].colours.main },
  { name: 'Hormones, Intimacy & Mind', choice: 'I want to feel more like me', colour: PEN_BRANDS['sharp-mind'].colours.main },
];
