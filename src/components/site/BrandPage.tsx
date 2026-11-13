'use client';
import { type ReactNode, useEffect } from 'react';
import { finishWalkThrough } from '@/hooks/useSide';
import { useReveal } from '@/hooks/useReveal';
import { SideDoor } from './SideDoor';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';

/**
 * Shell for brand pages: the doors (first visit only), nav, scroll reveals, footer.
 * A sister brand (Happy Hormones) brings its own header and footer.
 */
export function BrandPage({
  children,
  revealKey,
  doors = true,
  header,
  footer,
}: {
  children: ReactNode;
  revealKey?: unknown;
  doors?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  useReveal([revealKey]);
  // Arrived through a door from the other homepage: let the light fade.
  useEffect(finishWalkThrough, []);
  return (
    <>
      {doors && <SideDoor />}
      {header ?? <SiteNav />}
      <main>{children}</main>
      {footer ?? <SiteFooter />}
    </>
  );
}
