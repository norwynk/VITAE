'use client';
import type { ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';

/** Shell for brand pages: nav, scroll reveals, footer. */
export function BrandPage({ children, revealKey }: { children: ReactNode; revealKey?: unknown }) {
  useReveal([revealKey]);
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
