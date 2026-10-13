'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BrandedPen } from '@/hooks/useCatalogue';
import { PenCard } from './PenCard';

/**
 * The collection as video-style colour cards on a pink field. `featured` picks
 * which pens lead (in that order) before `limit` trims the list.
 */
export function Range({
  pens,
  error,
  title,
  limit,
  featured,
}: {
  pens: BrandedPen[] | null;
  error: string | null;
  title?: ReactNode;
  limit?: number;
  featured?: string[];
}) {
  const rank = (slug: string) => (featured?.includes(slug) ? featured.indexOf(slug) : Infinity);
  const ordered = featured && pens ? [...pens].sort((a, b) => rank(a.treatment.slug) - rank(b.treatment.slug)) : pens;
  const shown = limit ? ordered?.slice(0, limit) : ordered;
  return (
    <section className="range range--pink section">
      <div className="container">
        <div className="section-head" data-reveal>
          <h2 className="display">
            {title ?? (
              <>
                What do you
                <br />
                want more of?
              </>
            )}
          </h2>
          {pens && (
            <Link href="/shop" className="link-arrow">
              Meet all {pens.length}
            </Link>
          )}
        </div>
        {error && <p className="notice error">The pens could not be loaded: {error}</p>}
        {!pens && !error && <p className="muted">Loading the pens…</p>}
        {pens?.length === 0 && <p className="muted">No pens are available yet.</p>}
        <div className="cards-grid">
          {shown?.map((p, i) => (
            <PenCard key={p.treatment.id} pen={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
