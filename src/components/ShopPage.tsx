'use client';
import type { Treatment } from '@/domain/model';
import { Fragment, useState } from 'react';

const WEIGHT = 'Weight & Body';
import { CATEGORIES } from '@/brand/pens';
import { forSide } from '@/brand/sides';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useSide } from '@/hooks/useSide';
import { ConsultCard } from './brand/ConsultCard';
import { PenCard } from './brand/PenCard';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { BrandPage } from './site/BrandPage';

export function ShopPage({ initialPens }: { initialPens?: Treatment[] }) {
  const { pens: all, error } = useCatalogue(initialPens);
  const { side } = useSide();
  // The men's side lists the men's range only (cards outside it are also hidden by CSS from the first paint).
  const pens = all ? forSide(all, side, (p) => p.treatment.slug) : null;
  const categories = CATEGORIES.filter((c) => !pens || pens.some((p) => p.treatment.category === c.name));
  const [category, setCategory] = useState<string | null>(null);
  const shown = pens?.filter((p) => !category || p.treatment.category === category);
  return (
    <BrandPage revealKey={`${pens?.length}-${category}-${side}`}>
      <section className="page-hero container">
        <h1 className="display">
          <span className="split-line is-in"><span>Meet the</span></span>
          <span className="split-line is-in"><span style={{ color: 'var(--pink)', '--delay': '120ms' } as React.CSSProperties}>pricks.</span></span>
        </h1>
        <p className="serif-i page-hero__sub" data-reveal>
          Different goals. Different colours. Same source: a SAHPRA-licensed supplier, every batch tested, cold chain to your
          door. Clinician always.
        </p>
      </section>
      <section className="range range--pink" style={{ padding: 'var(--space-5) 0 var(--section)' }}>
        <div className="container">
          <div className="filters" role="group" aria-label="Filter by what you want">
            <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>
              All {pens ? `(${pens.length})` : ''}
            </button>
            {categories.map((c) => (
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
              <Fragment key={p.treatment.id}>
                <PenCard pen={p} index={i} />
                {/* After the last weight pen: other options are a conversation, not a product. */}
                {p.treatment.category === WEIGHT && shown[i + 1]?.treatment.category !== WEIGHT && <ConsultCard />}
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <RepeatScriptBand />
    </BrandPage>
  );
}
