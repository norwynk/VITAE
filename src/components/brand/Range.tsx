'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { BrandedPen } from '@/hooks/useCatalogue';
import { PenCard } from './PenCard';

/** The collection. The section background picks up the hovered pen's colour. */
export function Range({ pens, error, title }: { pens: BrandedPen[] | null; error: string | null; title?: React.ReactNode }) {
  const [tint, setTint] = useState<string | null>(null);
  return (
    <section className="range section" style={{ background: tint ?? 'transparent' }}>
      <div className="container">
        <div className="section-head" data-reveal>
          <h2 className="display">
            {title ?? (
              <>
                Four pricks.
                <br />
                Four different jobs.
              </>
            )}
          </h2>
          <Link href="/shop" className="link-arrow">
            See all pens
          </Link>
        </div>
        {error && <p className="notice error">The pens could not be loaded: {error}</p>}
        {!pens && !error && <p className="muted">Loading the pens…</p>}
        {pens?.length === 0 && <p className="muted">No pens are available yet.</p>}
        <div className="range__grid">
          {pens?.map((p, i) => (
            <PenCard key={p.treatment.id} pen={p} index={i} onFocusColour={setTint} />
          ))}
        </div>
      </div>
    </section>
  );
}
