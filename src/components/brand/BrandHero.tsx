'use client';
import Link from 'next/link';
import { RoyalPrick } from './RoyalPrick';

/** `who` is the sign-off under the trust line ("Designed for women."). */
export function BrandHero({ who = 'Designed for women.' }: { who?: string }) {
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          <h1 className="display hero__title is-in">
            <span className="split-line"><span>Not all pricks</span></span>
            <span className="split-line pop"><span style={{ '--delay': '140ms' } as React.CSSProperties}>are created equal.</span></span>
          </h1>
          <p className="serif-i hero__sub" data-reveal style={{ '--delay': '300ms' } as React.CSSProperties}>
            This one comes with a doctor.
          </p>
          <div className="hero__ctas" data-reveal style={{ '--delay': '420ms' } as React.CSSProperties}>
            <Link href="/start" className="btn">
              Start your assessment
            </Link>
            <Link href="/#how-it-works" className="link-arrow">
              How it works
            </Link>
          </div>
          <div className="hero__trust" data-reveal style={{ '--delay': '540ms' } as React.CSSProperties}>
            <span>Private</span>
            <span>Doctor-led</span>
            <span>Personal, never generic</span>
          </div>
          <p className="hero__women" data-reveal style={{ '--delay': '640ms' } as React.CSSProperties}>
            {who}
          </p>
        </div>
        <div className="hero__stage">
          <span className="hero__disc" />
          <span className="hero__disc two" />
          <span className="hero__disc three" />
          <RoyalPrick className="hero__royal" />
          <p className="hand hero__note">go on, tell us everything</p>
        </div>
      </div>
    </section>
  );
}
