'use client';
import { type ReactNode, useEffect } from 'react';
import { finishWalkThrough } from '@/hooks/useSide';
import { useReveal } from '@/hooks/useReveal';
import { SideDoor } from './SideDoor';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';

/** Shell for brand pages: the doors (first visit only), nav, scroll reveals, footer. */
export function BrandPage({ children, revealKey, doors = true }: { children: ReactNode; revealKey?: unknown; doors?: boolean }) {
  useReveal([revealKey]);
  // Arrived through a door from the other homepage: let the light fade.
  useEffect(finishWalkThrough, []);
  return (
    <>
      {doors && <SideDoor />}
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
