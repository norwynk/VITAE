'use client';
import { useState } from 'react';
import { CATEGORIES } from '@/brand/pens';
import { useCatalogue } from '@/hooks/useCatalogue';
import { PenCard } from './brand/PenCard';
import { BrandPage } from './site/BrandPage';

export function ShopPage() {
  const { pens, error } = useCatalogue();
  const [category, setCategory] = useState<string | null>(null);
  const shown = pens?.filter((p) => !category || p.treatment.category === category);
  return (
    <BrandPage revealKey={`${pens?.length}-${category}`}>
      <section className="page-hero container">
        <h1 className="display">
          <span className="split-line is-in"><span>Pick your</span></span>
          <span className="split-line is-in"><span style={{ color: 'var(--pink)', '--delay': '120ms' } as React.CSSProperties}>prick.</span></span>
        </h1>
        <p className="serif-i page-hero__sub" data-reveal>
          Different goals. Different colours. Same idea: more good days.
        </p>
      </section>
      <section className="range range--pink" style={{ padding: 'var(--space-5) 0 var(--section)' }}>
        <div className="container">
          <div className="filters" role="group" aria-label="Filter by what you want">
            <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>
              All {pens ? `(${pens.length})` : ''}
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.name} type="button" aria-pressed={category === c.name} onClick={() => setCategory(c.name)}>
                {c.name}
              </button>
            ))}
          </div>
          {error && <p className="notice error">The pens could not be loaded: {error}</p>}
          {!pens && !error && <p className="muted">Loading the pens…</p>}
          {shown?.length === 0 && <p className="muted">Nothing here yet.</p>}
          <div className="cards-grid">
            {shown?.map((p, i) => (
              <PenCard key={p.treatment.id} pen={p} index={i} />
            ))}
          </div>
        </div>
      </section>
    </BrandPage>
  );
}
