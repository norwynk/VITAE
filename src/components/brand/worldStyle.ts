import type { CSSProperties } from 'react';
import type { PenColours } from '@/brand/pens';

/** CSS custom properties that colour a product "world" or a personal accent. */
export function worldStyle(c: PenColours, extra: Record<string, string | number> = {}): CSSProperties {
  return {
    '--world-main': c.main,
    '--world-deep': c.deep,
    '--world-light': c.light,
    '--world-tint': c.tint,
    '--world-ink': c.ink,
    '--world-strong': c.strong,
    '--world-pastel': c.pastel,
    '--world-mist': c.mist,
    '--world-print': c.print,
    '--accent': c.main,
    '--accent-tint': c.tint,
    '--accent-ink': c.ink,
    '--accent-strong': c.strong,
    ...extra,
  } as CSSProperties;
}
