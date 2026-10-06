'use client';
import { useEffect, useState } from 'react';
import { type PenBrand, penBrand, sortRange } from '@/brand/pens';
import type { Treatment } from '@/domain/model';
import { repository } from '@/services/repository';

export interface BrandedPen {
  treatment: Treatment;
  brand: PenBrand;
}

/** Public catalogue from the repository, in range order, with brand presentation attached. */
export function useCatalogue(): { pens: BrandedPen[] | null; error: string | null } {
  const [pens, setPens] = useState<BrandedPen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    repository()
      .publicCatalogue()
      .then((items) => live && setPens(sortRange(items).map((t) => ({ treatment: t, brand: penBrand(t) }))))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return { pens, error };
}
