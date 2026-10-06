'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { BrandedPen } from '@/hooks/useCatalogue';
import { formatRand } from '@/domain/model';
import { Pen } from './Pen';
import { worldStyle } from './worldStyle';

/** A product as its own colour world. Hover lifts the pen; "Quick look" opens a popup. */
export function PenCard({ pen, index = 0, onFocusColour }: { pen: BrandedPen; index?: number; onFocusColour?: (c: string | null) => void }) {
  const { treatment: t, brand } = pen;
  const dialog = useRef<HTMLDialogElement>(null);
  const tilt = index % 2 ? 10 : -10;
  return (
    <>
      <article
        className="pen-card"
        style={worldStyle(brand.colours, { '--tilt': `${tilt}deg`, '--delay': `${index * 90}ms` })}
        data-reveal
        onMouseEnter={() => onFocusColour?.(brand.colours.tint)}
        onMouseLeave={() => onFocusColour?.(null)}
      >
        <Link href={`/pens/${t.slug}`} className="pen-card__world" aria-label={t.name}>
          <span className="pen-card__sun" />
          <span className="pen-card__orb a" />
          <span className="pen-card__orb b" />
          <Pen colours={brand.colours} label={brand.penLabel} className="pen-card__pen" />
        </Link>
        <div className="pen-card__body">
          <span className="tag">{brand.goalLabel}</span>
          <h3 className="pen-card__name">{t.name}</h3>
          <p className="small" style={{ margin: 0 }}>{brand.line}</p>
          <div className="pen-card__cta">
            <Link href={`/pens/${t.slug}`} className="link-arrow">
              Meet it
            </Link>
            <button type="button" className="btn small" onClick={() => dialog.current?.showModal()}>
              Quick look
            </button>
          </div>
        </div>
      </article>
      <dialog ref={dialog} className="quick-view" style={worldStyle(brand.colours)} aria-label={`${t.name} quick look`} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="quick-view__grid">
          <div className="quick-view__art">
            <span className="pen-card__sun" style={{ width: '70%' }} />
            <Pen colours={brand.colours} label={brand.penLabel} className="pen-card__pen" style={{ height: 380 }} />
          </div>
          <div className="quick-view__body">
            <span className="tag dark">{brand.colourName}</span>
            <h2 className="display" style={{ fontSize: 'var(--step-3)' }}>{t.name}</h2>
            <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.1, margin: 0 }}>
              {brand.statement[0]} {brand.statement[1]}
            </p>
            {t.priceCents > 0 && (
              <p className="price" style={{ margin: 0 }}>
                {formatRand(t.priceCents)} <span className="small muted">demo price</span>
              </p>
            )}
            <p className="small muted" style={{ margin: 0 }}>
              Every pen starts with a quick health screening and a clinician&apos;s review.
            </p>
            <div className="row">
              <Link href={`/pens/${t.slug}`} className="btn accent">
                See the full story
              </Link>
              <Link href={`/app?pen=${t.slug}`} className="link-arrow">
                Start screening
              </Link>
            </div>
          </div>
        </div>
        <form method="dialog">
          <button className="quick-view__close secondary small" aria-label="Close quick look">
            Close
          </button>
        </form>
      </dialog>
    </>
  );
}
