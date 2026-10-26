'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { PEN_BRANDS } from '@/brand/pens';
import { SOURCE } from '@/brand/source';
import { useParallax } from '@/hooks/useReveal';
import { PenStage } from './Pen';

/** `pen` leads the hero; `who` is the sign-off under the trust line ("Designed for women."). */
export function BrandHero({ pen = 'the-glow-up', who = 'Designed for women.' }: { pen?: string; who?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage, 0.12);
  const hero = PEN_BRANDS[pen];
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          <h1 className="display hero__title is-in">
            <span className="split-line"><span>Not all pricks</span></span>
            <span className="split-line pop"><span style={{ '--delay': '140ms' } as React.CSSProperties}>are created equal.</span></span>
          </h1>
          <p className="serif-i hero__sub" data-reveal style={{ '--delay': '300ms' } as React.CSSProperties}>
            Peptide pens from a licensed source, with a clinician behind every single one.
          </p>
          <div className="hero__ctas" data-reveal style={{ '--delay': '420ms' } as React.CSSProperties}>
            <Link href="/find-your-prick" className="btn">
              Find your prick
            </Link>
            <Link href="/shop" className="link-arrow">
              Meet the pricks
            </Link>
          </div>
          <div className="hero__trust" data-reveal style={{ '--delay': '540ms' } as React.CSSProperties}>
            <span>{SOURCE.licensed}</span>
            <span>{SOURCE.tested}</span>
            <span>Clinician-reviewed</span>
          </div>
          <p className="hero__women" data-reveal style={{ '--delay': '640ms' } as React.CSSProperties}>
            {who}
          </p>
        </div>
        <div className="hero__stage" ref={stage}>
          <span className="hero__disc" />
          <span className="hero__disc two" />
          <span className="hero__disc three" />
          <PenStage colours={hero.colours} label={hero.penLabel} botanical={hero.botanical} angle={-48} fit={0.98} className="hero__pen pen-stage--float" title={`PRICK ${hero.penLabel} pen`} />
          <p className="hand hero__note">this one&apos;s yours?</p>
        </div>
      </div>
    </section>
  );
}
