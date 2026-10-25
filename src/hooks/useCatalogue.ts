'use client';
import { useEffect, useState } from 'react';
import { type PenBrand, penBrand, sortRange } from '@/brand/pens';
import type { Treatment } from '@/domain/model';
import { repository } from '@/services/repository';

export interface BrandedPen {
  treatment: Treatment;
  brand: PenBrand;
}

const branded = (items: Treatment[]): BrandedPen[] => sortRange(items).map((t) => ({ treatment: t, brand: penBrand(t) }));

/**
 * Public catalogue from the repository, in range order, with brand
 * presentation attached. `initial` (from the server) renders straight away,
 * so the pens are in the HTML for search engines; the live catalogue then
 * replaces it.
 */
export function useCatalogue(initial?: Treatment[]): { pens: BrandedPen[] | null; error: string | null } {
  const [pens, setPens] = useState<BrandedPen[] | null>(() => (initial ? branded(initial) : null));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    repository()
      .publicCatalogue()
      .then((items) => live && setPens(branded(items)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return { pens, error };
}
