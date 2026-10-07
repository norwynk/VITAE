'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatRand } from '@/domain/model';
import { useCatalogue } from '@/hooks/useCatalogue';
import { PenStage } from './brand/Pen';
import { PenCard } from './brand/PenCard';
import { worldStyle } from './brand/worldStyle';
import { BrandPage } from './site/BrandPage';

const REG_STATUS: Record<string, string> = {
  UNCONFIRMED: 'Regulatory status not yet confirmed. This pen cannot be ordered until it is.',
  VERIFIED: 'Regulatory status confirmed.',
  NOT_PERMITTED: 'Not available.',
};

/**
 * Expanded product view: emotion first (outcome, feeling, transformation),
 * then what it is, then verified clinical information, eligibility,
 * screening, safety and the process.
 */
export function ProductPage({ slug }: { slug: string }) {
  const { pens, error } = useCatalogue();
  const pen = pens?.find((p) => p.treatment.slug === slug);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (error) return <BrandPage><p className="container notice error">This pen could not be loaded: {error}</p></BrandPage>;
  if (!pens) return <BrandPage><p className="container muted" style={{ padding: 'var(--section) 0' }}>Loading…</p></BrandPage>;
  if (!pen) {
    return (
      <BrandPage>
        <section className="page-hero container">
          <h1 className="display">Not found.</h1>
          <p className="serif-i page-hero__sub">That pen isn&apos;t in the range.</p>
          <Link href="/shop" className="btn">See all pens</Link>
        </section>
      </BrandPage>
    );
  }

  const { treatment: t, brand } = pen;
  const needsApproval = t.requiresClinicianApproval || t.requiresPrescription;
  const startHref = `/app?pen=${t.slug}`;
  const related = pens.filter((p) => p.treatment.id !== t.id && p.treatment.category === t.category);

  return (
    <BrandPage revealKey={t.id}>
      <div style={worldStyle(brand.colours)}>
        <section className="product-hero">
          <div className="product-hero__art product-hero__art--world">
            <span className="flip-card__glow" style={{ opacity: 1 }} />
            <PenStage colours={brand.colours} label={brand.penLabel} angle={-52} fit={0.86} className="pen-stage--float" title={`PRICK ${t.name} pen`} />
          </div>
          <div className="product-hero__info">
            <span className="tag dark">{brand.category}</span>
            <h1 className="display product-hero__name">{t.name}</h1>
            <p className="serif-i product-hero__statement">{brand.hook}</p>
            {t.priceCents > 0 && (
              <p className="price" style={{ margin: 0 }}>
                {formatRand(t.priceCents)} <span className="small muted">demo price{t.billing === 'MONTHLY' ? ' per month' : ''}</span>
              </p>
            )}
            <div className="purchase-options" role="list">
              <div className="purchase-option" role="listitem">
                <span>
                  <strong>One pen</strong>
                  <br />
                  <span className="small muted">Ordered from your account once approved</span>
                </span>
                <span className="badge">Available after approval</span>
              </div>
              {/* No recurring delivery in the backend yet. */}
              <div className="purchase-option" role="listitem" data-unavailable="true">
                <span>
                  <strong>On repeat</strong>
                  <br />
                  <span className="small muted">Automatic repeat delivery</span>
                </span>
                <span className="badge">Coming soon</span>
              </div>
            </div>
            <div className="row" style={{ gap: 'var(--space-3)' }}>
              <Link href={startHref} className="btn product-hero__cta">
                Start screening
              </Link>
              <Link href="/find-your-prick" className="link-arrow">
                Not sure? Take the quiz
              </Link>
            </div>
            {needsApproval && (
              <p className="gate-note">
                Every pen starts with a private health screening and a clinician&apos;s review. You can only order it if
                your clinician approves it for you.
              </p>
            )}
          </div>
        </section>

        {/* Emotion first */}
        <section className="story-band">
          <div className="container story-band__grid">
            <div data-reveal>
              <p className="eyebrow">Outcome</p>
              <p className="story-band__text">{brand.outcome}</p>
            </div>
            <div data-reveal style={{ '--delay': '120ms' } as React.CSSProperties}>
              <p className="eyebrow">Feeling</p>
              <p className="story-band__feeling">{brand.feeling}</p>
            </div>
            <div data-reveal style={{ '--delay': '240ms' } as React.CSSProperties}>
              <p className="eyebrow">Transformation</p>
              <p className="story-band__text">{brand.transformation}</p>
            </div>
          </div>
        </section>

        <div className="container">
          <section className="info-block" data-reveal>
            <h2 className="display">For when</h2>
            <div>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.2 }}>{brand.cardBack}</p>
              {brand.benefits.length > 0 && (
                <ul className="outcome-list" style={{ marginTop: 'var(--space-3)' }}>
                  {brand.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <p className="small muted" style={{ marginTop: 'var(--space-3)' }}>
                These describe what people are hoping for, not a promise. Your clinician will talk you through what&apos;s
                realistic for you.
              </p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">What it actually is</h2>
            <p>{t.summary}</p>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Peptide / stack</h2>
            <div>
              <p className="display" style={{ fontSize: 'var(--step-3)', lineHeight: 1 }}>{t.peptide || 'To be confirmed'}</p>
              <p className="muted">Exact composition and strength are confirmed by your clinician as part of your plan.</p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Verified clinical information</h2>
            {/* Only verified clinical content belongs here. None has been supplied yet. */}
            <div className="placeholder" data-placeholder="clinical">
              <p style={{ margin: 0 }}>
                Not yet verified. Clinical information for {t.name} will be published here once it has been reviewed and
                approved by our clinical team.
              </p>
              {t.clinicalDescription && <p style={{ margin: 'var(--space-2) 0 0' }}>{t.clinicalDescription}</p>}
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Eligibility</h2>
            <div>
              <p>
                Adults aged 18 and over, where a clinician decides after screening that it&apos;s appropriate. Not everyone
                will be approved, and that&apos;s the point of the screening.
              </p>
              {t.requiredLabs.length > 0 && (
                <p className="muted">Your clinician may ask for testing first ({t.requiredLabs.join(', ')}). If so, they&apos;ll arrange it.</p>
              )}
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Screening</h2>
            <div>
              <p>
                A private questionnaire about you, your health history, current medication and lifestyle, and what you want
                to change. Your answers go to your clinician only, not to delivery or support staff.
              </p>
              <Link href={startHref} className="link-arrow">Start your screening</Link>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Safety</h2>
            <div>
              <p>{REG_STATUS[t.regulatoryStatus] ?? ''}</p>
              <p>
                {needsApproval ? 'Requires a clinician’s approval. ' : ''}Your clinician sets your plan; you can&apos;t
                change the dose yourself. If something feels off, flag it in a check-in or message and it goes straight to
                your clinician. In an emergency call 10177.
              </p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">How the process works</h2>
            <ol className="checklist" style={{ margin: 0 }}>
              <li>Complete your private health screening.</li>
              <li>Ask for a clinical review of {t.name}.</li>
              <li>A clinician decides whether it&apos;s right for you. They may ask for more information, suggest a different pen, or decline.</li>
              <li>If approved, your plan, reminders and check-ins appear in your account, and you can order.</li>
            </ol>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">FAQs</h2>
            <div className="faq">
              <details>
                <summary>Can I order it straight away?</summary>
                <div>No. You complete a health screening first, then a clinician reviews it. Ordering opens only if you&apos;re approved.</div>
              </details>
              <details>
                <summary>Who sees my health information?</summary>
                <div>Your assigned clinician. Delivery and support staff see what they need to get an order to you, not your health details.</div>
              </details>
              <details>
                <summary>Can I change my dose?</summary>
                <div>No, your clinician sets it. You can change when your reminders arrive, and you can message your clinician any time.</div>
              </details>
              <details>
                <summary>Is there a subscription?</summary>
                <div>Not yet. Automatic repeat delivery is coming. For now you reorder from your account while your approval lasts.</div>
              </details>
            </div>
          </section>
        </div>

        {related.length > 0 && (
          <section className="range range--pink section">
            <div className="container">
              <div className="section-head" data-reveal>
                <h2 className="display">
                  More in
                  <br />
                  {brand.category}
                </h2>
              </div>
              <div className="cards-grid">
                {related.map((p, i) => (
                  <PenCard key={p.treatment.id} pen={p} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className={`sticky-cta${stuck ? ' show' : ''}`}>
          <strong className="display" style={{ fontSize: '1.3rem' }}>{t.name}</strong>
          <Link href={startHref} className="btn product-hero__cta">
            Start screening
          </Link>
        </div>
      </div>
    </BrandPage>
  );
}
