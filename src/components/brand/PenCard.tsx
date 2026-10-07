'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { BrandedPen } from '@/hooks/useCatalogue';
import { PenStage } from './Pen';
import { worldStyle } from './worldStyle';

/**
 * Product card in three layers:
 * front (colour world, name, hook; hover pops the pen), flip (outcome,
 * feeling, transformation), then the full product page via "View the pen".
 */
export function PenCard({ pen, index = 0 }: { pen: BrandedPen; index?: number }) {
  const { treatment: t, brand } = pen;
  const [flipped, setFlipped] = useState(false);
  const href = `/pens/${t.slug}`;
  // Clicking the card itself flips it; links and buttons keep their own job.
  const flipFromCard = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    setFlipped((f) => !f);
  };
  return (
    <article
      className="flip-card"
      style={worldStyle(brand.colours, { '--delay': `${(index % 3) * 90}ms` })}
      data-reveal
      aria-label={t.name}
    >
      <div className={`flip-card__inner${flipped ? ' is-flipped' : ''}`}>
        <div className="flip-card__face flip-card__front" onClick={flipFromCard}>
          <h3 className="flip-card__name">{t.name}</h3>
          <div className="flip-card__stage" aria-hidden="true">
            <span className="flip-card__glow" />
            <span className="flip-card__burst a" />
            <span className="flip-card__burst b" />
            <span className="flip-card__burst c" />
            <PenStage colours={brand.colours} label={brand.penLabel} angle={index % 2 ? -62 : -54} fit={0.92} />
          </div>
          <p className="flip-card__hook">{brand.hook}</p>
          <div className="flip-card__actions">
            <button type="button" className="btn small flip-card__btn-strong" onClick={() => setFlipped(true)} aria-expanded={flipped}>
              What you get
            </button>
            <Link href={href} className="btn small flip-card__btn-light">
              View the pen
            </Link>
          </div>
        </div>
        <div className="flip-card__face flip-card__back" onClick={flipFromCard}>
          <p className="eyebrow">{brand.category}</p>
          <h3 className="flip-card__name flip-card__name--back">{t.name}</h3>
          <dl className="flip-card__story">
            <div>
              <dt>Outcome</dt>
              <dd>{brand.outcome}</dd>
            </div>
            <div>
              <dt>Feeling</dt>
              <dd className="flip-card__feeling">{brand.feeling}</dd>
            </div>
            <div>
              <dt>Transformation</dt>
              <dd>{brand.transformation}</dd>
            </div>
          </dl>
          <div className="flip-card__actions">
            <Link href={href} className="btn small flip-card__btn-light">
              View the pen
            </Link>
            <button type="button" className="btn small flip-card__btn-strong" onClick={() => setFlipped(false)}>
              Flip back
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
