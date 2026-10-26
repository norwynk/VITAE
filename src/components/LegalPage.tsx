'use client';
import type { ReactNode } from 'react';
import { BrandPage } from './site/BrandPage';

/** Plain reading layout for the privacy notice and terms. */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <BrandPage doors={false}>
      <article className="about container legal">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display about__title">{title}</h1>
        <p className="muted small">Last updated {updated}</p>
        <div className="about__body">{children}</div>
      </article>
    </BrandPage>
  );
}
