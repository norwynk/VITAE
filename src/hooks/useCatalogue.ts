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
 * replaces it. If the live catalogue can't be reached or comes back empty
 * (a browser whose security check is being refused, a dropped connection),
 * the server's list stays: the range never vanishes from the page.
 */
export function useCatalogue(initial?: Treatment[]): { pens: BrandedPen[] | null; error: string | null } {
  const [pens, setPens] = useState<BrandedPen[] | null>(() => (initial ? branded(initial) : null));
  const [error, setError] = useState<string | null>(null);
  const [fallback] = useState(Boolean(initial));
  useEffect(() => {
    let live = true;
    repository()
      .publicCatalogue()
      .then((items) => live && (items.length || !fallback) && setPens(branded(items)))
      .catch((e: Error) => live && !fallback && setError(e.message));
    return () => {
      live = false;
    };
  }, [fallback]);
  return { pens, error };
}
