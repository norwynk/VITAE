'use client';
import { useState } from 'react';
import { GOALS, type GoalKey } from '@/brand/pens';
import { useCatalogue } from '@/hooks/useCatalogue';
import { PenCard } from './brand/PenCard';
import { BrandPage } from './site/BrandPage';

export function ShopPage() {
  const { pens, error } = useCatalogue();
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const shown = pens?.filter((p) => !goal || p.brand.goals.includes(goal));
  return (
    <BrandPage revealKey={`${pens?.length}-${goal}`}>
      <section className="page-hero container">
        <h1 className="display">
          <span className="split-line is-in"><span>Pick your</span></span>
          <span className="split-line is-in"><span style={{ color: 'var(--pink)', '--delay': '120ms' } as React.CSSProperties}>prick.</span></span>
        </h1>
        <p className="serif-i page-hero__sub" data-reveal>
          Different goals. Different colours. Same idea: more good days.
        </p>
      </section>
      <section className="container" style={{ paddingBottom: 'var(--section)' }}>
        <div className="filters" role="group" aria-label="Filter by what you want">
          <button type="button" aria-pressed={goal === null} onClick={() => setGoal(null)}>
            All
          </button>
          {GOALS.map((g) => (
            <button key={g.key} type="button" aria-pressed={goal === g.key} onClick={() => setGoal(g.key)}>
              {g.filter}
            </button>
          ))}
        </div>
        {error && <p className="notice error">The pens could not be loaded: {error}</p>}
        {!pens && !error && <p className="muted">Loading the pens…</p>}
        {shown?.length === 0 && <p className="muted">Nothing here yet for that goal.</p>}
        <div className="shop__grid">
          {shown?.map((p, i) => (
            <PenCard key={p.treatment.id} pen={p} index={i} />
          ))}
        </div>
      </section>
    </BrandPage>
  );
}
