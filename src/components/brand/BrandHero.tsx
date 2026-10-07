'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { PEN_BRANDS } from '@/brand/pens';
import { useParallax } from '@/hooks/useReveal';
import { PenStage } from './Pen';

export function BrandHero() {
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage, 0.12);
  const hero = PEN_BRANDS['the-glow-up'];
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          <h1 className="display hero__title is-in">
            <span className="split-line"><span>Pick your</span></span>
            <span className="split-line pop"><span style={{ '--delay': '140ms' } as React.CSSProperties}>Prick.</span></span>
          </h1>
          <p className="serif-i hero__sub" data-reveal style={{ '--delay': '300ms' } as React.CSSProperties}>
            Peptide pens for more of what you want from your days.
          </p>
          <div className="hero__ctas" data-reveal style={{ '--delay': '420ms' } as React.CSSProperties}>
            <Link href="/find-your-prick" className="btn">
              Find your prick
            </Link>
            <Link href="/shop" className="link-arrow">
              Explore the pens
            </Link>
          </div>
          <div className="hero__trust" data-reveal style={{ '--delay': '540ms' } as React.CSSProperties}>
            <span>Clinician-guided</span>
            <span>Personalised</span>
            <span>Made for real life</span>
          </div>
          <p className="hero__women" data-reveal style={{ '--delay': '640ms' } as React.CSSProperties}>
            Designed for women.
          </p>
        </div>
        <div className="hero__stage" ref={stage}>
          <span className="hero__disc" />
          <span className="hero__disc two" />
          <span className="hero__disc three" />
          <PenStage colours={hero.colours} label={hero.penLabel} angle={-48} fit={0.98} className="hero__pen pen-stage--float" title="PRICK The Glow Up pen in hot pink" />
          <p className="hand hero__note">this one&apos;s yours?</p>
        </div>
      </div>
    </section>
  );
}
