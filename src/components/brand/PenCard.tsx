'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { BrandedPen } from '@/hooks/useCatalogue';
import { feelingLine } from '@/brand/pens';
import { BotanicalSpill } from './Botanicals';
import { NeedsVerification } from './NeedsVerification';
import { PenStage } from './Pen';
import { worldStyle } from './worldStyle';

/**
 * Product card. Front is Layer 1 (desire: colour world, name, hook,
 * one-line outcome; hover pops the pen). The flip is Layer 2
 * (transformation: feeling, transformation, benefits). Layers 3 and 4 live
 * on the product page behind "View the pen".
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
        <div
          className={`flip-card__face flip-card__front flip-card__front--bloom${brand.cardImage ? ' has-photo' : ''}`}
          onClick={flipFromCard}
          style={brand.cardImage ? { backgroundImage: `url(${brand.cardImage})` } : undefined}
        >
          <h3 className="flip-card__name flip-card__name--bloom">{t.name}</h3>
          <p className="flip-card__hook">{brand.hook}</p>
          <p className="flip-card__outcome">{brand.outcome}</p>
          <div className="flip-card__stage" aria-hidden="true">
            <span className="flip-card__glow" />
            <span className="flip-card__burst a" />
            <span className="flip-card__burst b" />
            <span className="flip-card__burst c" />
            <PenStage colours={brand.colours} label={brand.penLabel} botanical={brand.botanical} angle={index % 2 ? -76 : -70} fit={0.94} />
          </div>
          {!brand.cardImage && <BotanicalSpill kind={brand.botanical} colours={brand.colours} className="flip-card__spill" />}
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
              <dt>Feeling</dt>
              <dd className="flip-card__feeling">{feelingLine(brand)}</dd>
            </div>
            <div>
              <dt>Transformation</dt>
              <dd>{brand.transformation}</dd>
            </div>
            <div>
              <dt>What you get</dt>
              <dd>
                {brand.benefits.length ? (
                  <ul className="flip-card__benefits">
                    {brand.benefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : (
                  <NeedsVerification what="benefits" />
                )}
              </dd>
            </div>
          </dl>
          {/* Layers 1 and 2 describe a feeling; the facts live behind "View the pen". */}
          <p className="flip-card__boundary">A feeling, not a medical claim. The facts are on the next page.</p>
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
