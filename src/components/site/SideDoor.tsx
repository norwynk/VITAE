'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Side } from '@/brand/sides';
import { walkThrough } from '@/hooks/useSide';

const OPEN_MS = 950;

/** Bathroom-door pictograms, drawn rather than borrowed. */
function Figure({ side }: { side: Side }) {
  return (
    <svg viewBox="0 0 60 120" aria-hidden="true" className="side-door__figure">
      <circle cx="30" cy="14" r="11" />
      {side === 'women' ? (
        <>
          <path d="M30 30 L52 82 H8 Z" />
          <rect x="17" y="82" width="8" height="34" rx="4" />
          <rect x="35" y="82" width="8" height="34" rx="4" />
        </>
      ) : (
        <>
          <rect x="12" y="30" width="36" height="50" rx="8" />
          <rect x="15" y="74" width="12" height="42" rx="5" />
          <rect x="33" y="74" width="12" height="42" rx="5" />
        </>
      )}
    </svg>
  );
}

/**
 * The first thing a new visitor sees: two doors. Shown only while
 * <html class="choose-side"> is set (no door chosen yet), so returning
 * visitors and the men's pages never see it. Push a door: it swings open,
 * the light spills out, and they walk through to their side.
 */
export function SideDoor() {
  const router = useRouter();
  const path = usePathname();
  const [opening, setOpening] = useState<Side | null>(null);

  const go = (side: Side) => {
    if (opening) return;
    setOpening(side);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        walkThrough(side, path, router.push);
        setOpening(null);
      },
      reduced ? 0 : OPEN_MS,
    );
  };

  return (
    <div className={`side-door${opening ? ` is-opening is-opening--${opening}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="side-door-title">
      <div className="side-door__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/prick-logo-white.png" alt="PRICK" width={900} height={277} className="side-door__logo" />
        <h2 id="side-door-title" className="display side-door__title">
          Which way?
        </h2>
        <p className="side-door__lead">Pick your door. Every pen behind both comes from a licensed source, with a clinician&apos;s yes first.</p>
        <div className="side-door__doors">
          {(['women', 'men'] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={`side-door__door side-door__door--${side}${opening === side ? ' is-open' : ''}`}
              onClick={() => go(side)}
              aria-label={side === 'women' ? 'Women: go through to the women’s side' : 'Men: go through to the men’s side'}
            >
              <span className="side-door__light" aria-hidden="true" />
              <span className="side-door__leaf">
                <span className="side-door__plate">
                  <Figure side={side} />
                </span>
                <span className="side-door__word">{side === 'women' ? 'Women' : 'Men'}</span>
                <span className="side-door__push">Push</span>
                <span className="side-door__handle" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
        <p className="side-door__small">You can switch sides any time from the menu.</p>
      </div>
    </div>
  );
}
