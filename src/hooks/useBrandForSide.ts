'use client';
import type { PenBrand } from '@/brand/pens';
import { forMen } from '@/brand/sides';
import { useSide } from './useSide';

const same = (brand: PenBrand) => brand;

/** The pen as this side shows it (the men's side may give a pen its own colour). */
export function useBrandForSide(): (brand: PenBrand) => PenBrand {
  const { side } = useSide();
  return side === 'men' ? forMen : same;
}
