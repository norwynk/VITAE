'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import '@/app/happy-hormones/happy-hormones.css';

/**
 * Happy Hormones' own header, footer and brand marks. It's PRICK's sister brand,
 * so PRICK only appears as "a PRICK sister brand", never as the frame.
 */

export const HH_START = '/happy-hormones/start';
const YEAR = new Date().getFullYear();

export function HHFlower({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="-1.2 -1.2 2.4 2.4" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="0" cy="-0.58" r="0.46" />
        <circle cx="0.55" cy="-0.18" r="0.46" />
        <circle cx="0.34" cy="0.47" r="0.46" />
        <circle cx="-0.34" cy="0.47" r="0.46" />
        <circle cx="-0.55" cy="-0.18" r="0.46" />
      </g>
      <circle r="0.3" fill="#fde7b8" />
    </svg>
  );
}

export function HHLogo({ className }: { className?: string }) {
  return (
    <span className={`hh-logo${className ? ` ${className}` : ''}`}>
      Happy
      <br />
      Hormones
      <HHFlower className="hh-logo__flower" />
    </span>
  );
}

/** The ribbon of colour from the label, drifting slowly. Each wave repeats every 1440 units, so the loop has no seam. */
const WAVES = [
  { d: 'M0 170 C 240 170 480 50 720 50 S 1200 170 1440 170 L1440 300 L0 300 Z', fill: 'var(--hh-gold)', x: 0 },
  { d: 'M0 215 C 240 215 480 115 720 115 S 1200 215 1440 215 L1440 300 L0 300 Z', fill: 'var(--hh-pink)', x: -260 },
  { d: 'M0 262 C 240 262 480 192 720 192 S 1200 262 1440 262 L1440 300 L0 300 Z', fill: 'var(--hh-orange)', x: -520 },
];

export function HHWaves({ className }: { className?: string }) {
  return (
    <svg className={`hh-waves${className ? ` ${className}` : ''}`} viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
      {WAVES.map((w, i) => (
        <g key={i} transform={`translate(${w.x} 0)`}>
          <g className="hh-waves__drift" style={{ animationDuration: `${22 + i * 6}s` }}>
            {/* Three copies, so the offset layers never show an edge while drifting. */}
            {[0, 1440, 2880].map((dx) => (
              <path key={dx} d={w.d} fill={w.fill} transform={`translate(${dx} 0)`} />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}

const LINKS = [
  { href: '/happy-hormones#range', label: 'The three' },
  { href: '/happy-hormones#bloods', label: 'Bloods first' },
  { href: '/happy-hormones#why', label: 'Why hormones' },
];

/** Happy Hormones' own header: its logo, its links, and one quiet nod to PRICK. */
export function HHHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="hh hh-header">
      <div className="hh-header__inner">
        <Link href="/happy-hormones" className="hh-header__logo" aria-label="Happy Hormones home">
          <HHLogo />
        </Link>
        <nav className="hh-header__links" aria-label="Happy Hormones">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hh-header__end">
          <Link href="/" className="hh-header__sister">
            A PRICK sister brand
          </Link>
          {cta && (
            <Link href={HH_START} className="hh-btn hh-btn--small">
              Start
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** The footer: the sunny "ready to be happy?" close, with everything a footer needs. */
export function HHFooter() {
  return (
    <footer className="hh hh-finale" aria-labelledby="hh-finale-title">
      <HHWaves className="hh-finale__waves" />
      <div className="hh-finale__inner">
        <HHLogo className="hh-finale__logo" />
        <h2 id="hh-finale-title" className="hh-finale__title">
          Ready to be happy? <em>Hormonally.</em>
        </h2>
        <div className="hh-hero__actions">
          <Link href={HH_START} className="hh-btn hh-btn--light">
            Start my screening
          </Link>
          <Link href="/happy-hormones#bloods" className="hh-btn hh-btn--outline">
            How the bloods work
          </Link>
        </div>
        <nav className="hh-finale__links" aria-label="Happy Hormones footer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/app">My account</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/">A PRICK sister brand</Link>
        </nav>
        <p className="hh-finale__small">
          Prescription medicines. Available only after blood tests and a consultation with a South African registered doctor, who decides whether anything is right for you and at what dose.
        </p>
        <p className="hh-finale__small">© {YEAR} Happy Hormones</p>
      </div>
    </footer>
  );
}
