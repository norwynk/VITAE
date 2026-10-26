'use client';
import Link from 'next/link';
import { penBrand } from '@/brand/pens';
import type { Treatment } from '@/domain/model';
import { penSafety } from '@/domain/penSafety';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useScreening } from '@/hooks/useScreening';
import { useShortlist } from '@/hooks/useShortlist';
import { worldStyle } from './brand/worldStyle';
import { BrandPage } from './site/BrandPage';

/**
 * "My pens" before there is an account: the pens picked on this device,
 * with a way to remove them, clear them, or take them into screening.
 */
export function MyPensPage({ initialPens }: { initialPens?: Treatment[] }) {
  const { pens } = useCatalogue(initialPens);
  const shortlist = useShortlist();
  const screening = useScreening();
  const chosen = shortlist.slugs.map((s) => pens?.find((p) => p.treatment.slug === s)).filter((p) => p !== undefined);
  const started = Object.keys(screening.state.answers).length > 0;

  return (
    <BrandPage>
      <section className="container narrow my-pens-page">
        <p className="eyebrow">My pens</p>
        <h1 className="display my-pens-page__title">{chosen.length ? 'Your shortlist.' : 'No pens yet.'}</h1>
        <p className="intake__lead">
          {chosen.length
            ? 'These are the pens you’d like your clinician to consider. Nothing is ordered: a clinician decides what’s right for you after your screening.'
            : 'Find the pen that fits what you want, and it will wait here while you do your screening.'}
        </p>

        {chosen.length > 0 && (
          <ul className="plain my-pens-page__list">
            {chosen.map(({ treatment: t }) => {
              const b = penBrand(t);
              return (
                <li key={t.id} className="screening__pen" style={worldStyle(b.colours)}>
                  <span className="screening__pen-dot" />
                  <span className="screening__pen-name">
                    <Link href={`/pens/${t.slug}`}>{t.name}</Link>
                  </span>
                  <span className="screening__pen-hook">
                    {b.hook}
                    {penSafety(t.slug) && <span className="pen-pick__safety"> · Includes a safety check</span>}
                  </span>
                  <button type="button" className="secondary small" onClick={() => shortlist.remove(t.slug)} aria-label={`Remove ${t.name}`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="row">
          {chosen.length ? (
            <Link href="/start" className="btn">
              {started ? 'Continue my screening' : 'Start my screening'}
            </Link>
          ) : (
            <Link href="/find-your-prick" className="btn">
              Find your prick
            </Link>
          )}
          {(chosen.length > 0 || started) && (
            <button
              type="button"
              className="link-arrow intake__clear"
              onClick={() => {
                if (!window.confirm('Start over? This removes your pens and any screening answers saved on this device.')) return;
                shortlist.clear();
                screening.clear();
              }}
            >
              Clear everything
            </button>
          )}
        </div>
        <p className="small muted">
          Already have an account? <Link href="/app">Sign in</Link> to see your pens and your clinician&apos;s replies.
        </p>
      </section>
    </BrandPage>
  );
}
