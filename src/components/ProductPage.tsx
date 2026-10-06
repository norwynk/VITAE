'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatRand } from '@/domain/model';
import { useCatalogue } from '@/hooks/useCatalogue';
import { Pen } from './brand/Pen';
import { PenCard } from './brand/PenCard';
import { worldStyle } from './brand/worldStyle';
import { BrandPage } from './site/BrandPage';

const REG_STATUS: Record<string, string> = {
  UNCONFIRMED: 'Regulatory status not yet confirmed. This pen cannot be ordered until it is.',
  VERIFIED: 'Regulatory status confirmed.',
  NOT_PERMITTED: 'Not available.',
};

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
  const related = pens.filter((p) => p.treatment.id !== t.id);

  return (
    <BrandPage revealKey={t.id}>
      <div style={worldStyle(brand.colours)}>
        <section className="product-hero">
          <div className="product-hero__art">
            <span className="pen-card__sun" />
            <span className="pen-card__orb a" />
            <span className="pen-card__orb b" />
            <Pen colours={brand.colours} label={brand.penLabel} className="product-hero__pen" title={`PRICK ${t.name} pen`} />
          </div>
          <div className="product-hero__info">
            <span className="tag dark">{brand.colourName}</span>
            <h1 className="display product-hero__name">{t.name}</h1>
            <p className="serif-i product-hero__statement">
              {brand.statement[0]}
              <br />
              {brand.statement[1]}
            </p>
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
              <Link href={startHref} className="btn accent">
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

        <div className="container">
          <section className="info-block" data-reveal>
            <h2 className="display">What it&apos;s for</h2>
            <div>
              <ul className="outcome-list">
                <li>{brand.goalLabel}</li>
              </ul>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15, marginTop: 'var(--space-3)' }}>{brand.line}</p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">How it works</h2>
            <ol className="checklist" style={{ margin: 0 }}>
              <li>Complete a private health screening.</li>
              <li>Ask for a clinical review of {t.name}.</li>
              <li>A clinician decides whether it&apos;s right for you. They may suggest a different pen, or none.</li>
              <li>If approved, your plan, reminders and check-ins appear in your account, and you can order.</li>
            </ol>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">What&apos;s inside</h2>
            {/* Only verified ingredient information belongs here; none exists yet. */}
            <div className="placeholder" data-placeholder="ingredients">
              <p style={{ margin: 0 }}>{t.summary}</p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Who it may be for</h2>
            <div>
              <p>
                Adults aged 18 and over, where a clinician decides after screening that it&apos;s appropriate. Not
                everyone will be approved, and that&apos;s the point of the screening.
              </p>
              {t.requiredLabs.length > 0 && (
                <p className="muted">Your clinician may ask for testing first ({t.requiredLabs.join(', ')}). If so, they&apos;ll arrange it.</p>
              )}
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">How to use it</h2>
            <div>
              <p>
                {t.administration.device === 'PEN' ? 'A pen you use yourself' : 'Used as directed'}
                {t.administration.route ? ` (${t.administration.route.toLowerCase()})` : ''}.{' '}
                {t.administration.instructions}
              </p>
              <p className="muted">Your dose and schedule are set by your clinician, not chosen here. You can change your reminder time any time.</p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">Clinical and safety</h2>
            <div>
              <p>{REG_STATUS[t.regulatoryStatus] ?? ''}</p>
              <p>
                {needsApproval ? 'Requires a clinician’s approval. ' : ''}
                If something feels off, flag it in a check-in or message and it goes straight to your clinician. In an
                emergency call 10177.
              </p>
            </div>
          </section>

          <section className="info-block" data-reveal>
            <h2 className="display">FAQs</h2>
            <div className="faq">
              <details>
                <summary>Can I order it straight away?</summary>
                <div>No. You complete a health screening first, then a clinician reviews it. Ordering opens only if you&apos;re approved.</div>
              </details>
              <details>
                <summary>What if it isn&apos;t right for me?</summary>
                <div>Your clinician may ask for more information, suggest a different pen, or decline. You&apos;ll see their decision and note in your account.</div>
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
          <section className="section">
            <div className="container">
              <div className="section-head" data-reveal>
                <h2 className="display">
                  Your next
                  <br />
                  prick?
                </h2>
              </div>
              <div className="range__grid">
                {related.map((p, i) => (
                  <PenCard key={p.treatment.id} pen={p} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className={`sticky-cta${stuck ? ' show' : ''}`}>
          <strong className="display" style={{ fontSize: '1.3rem' }}>{t.name}</strong>
          <Link href={startHref} className="btn accent">
            Start screening
          </Link>
        </div>
      </div>
    </BrandPage>
  );
}
