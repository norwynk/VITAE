import 'server-only';
import RANGE from '@/brand/range.json';
import { publicDataMode } from '@/config';
import { createFixtureStore } from '@/domain/fixtures';
import type { Treatment } from '@/domain/model';

/**
 * The PRICK range as the live catalogue presents it, for the first server
 * render: search engines see every pen in the HTML, and the browser then
 * refreshes it from Firestore. Live mode only (demo data is fictional and
 * stays client-side). Internal reviewer notes are never sent to the page.
 */
export function initialPens(): Treatment[] | undefined {
  if (publicDataMode() !== 'live') return undefined;
  const range = new Set(RANGE.products.map((p) => p.id));
  return Object.values(createFixtureStore(new Date()).treatments)
    .filter((t) => range.has(t.slug) && t.active && t.public)
    .map((t) => ({ ...t, demoFictional: false, priceCents: 0, purchasable: false, clinicalTruth: undefined }));
}
