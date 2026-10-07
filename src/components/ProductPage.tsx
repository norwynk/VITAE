'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { feelingLine } from '@/brand/pens';
import { formatRand } from '@/domain/model';
import { useCatalogue } from '@/hooks/useCatalogue';
import { NeedsVerification } from './brand/NeedsVerification';
import { PenStage } from './brand/Pen';
import { PenCard } from './brand/PenCard';
import { worldStyle } from './brand/worldStyle';
import { BrandPage } from './site/BrandPage';

const REG_STATUS: Record<string, string> = {
  UNCONFIRMED: 'Not yet confirmed for supply in South Africa. This pen cannot be ordered until it is.',
  VERIFIED: 'Confirmed for supply.',
  NOT_PERMITTED: 'Not available.',
};

function Truth({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Expanded product view in the four content layers: desire (hero),
 * transformation (colour band), product truth and clinical truth. Missing
 * truth fields show NEEDS VERIFICATION; Layers 1 and 2 never stand in for them.
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
  const truth = t.productTruth ?? {};
  const clinical = t.clinicalTruth ?? {};
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
            <p style={{ margin: 0, maxWidth: '46ch' }}>{brand.outcome}</p>
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

        {/* Layer 2: transformation. A feeling, never a medical claim. */}
        <section className="story-band">
          <div className="container">
            <p className="layer-label" style={{ color: 'inherit', opacity: 0.8 }}>How it could feel</p>
            <div className="story-band__grid">
              <div data-reveal>
                <p className="eyebrow">What you want</p>
                <p className="story-band__text">{brand.outcome}</p>
              </div>
              <div data-reveal style={{ '--delay': '120ms' } as React.CSSProperties}>
                <p className="eyebrow">Feeling</p>
                <p className="story-band__feeling">{feelingLine(brand)}</p>
              </div>
              <div data-reveal style={{ '--delay': '240ms' } as React.CSSProperties}>
                <p className="eyebrow">Transformation</p>
                <p className="story-band__text">{brand.transformation}</p>
              </div>
            </div>
            <p className="small" style={{ marginTop: 'var(--space-4)', opacity: 0.9 }}>
              This describes how people hope to feel. It is not a medical claim or a promise. What the pen actually
              contains, and what the evidence supports, is below.
            </p>
          </div>
        </section>

        <div className="container">
          {/* Layer 3: product truth, verbatim from the catalogue. */}
          <section className="info-block" data-reveal>
            <div>
              <span className="layer-label">Product truth</span>
              <h2 className="display">What&apos;s actually in it</h2>
            </div>
            <dl className="truth-list">
              <Truth label="Active ingredient">
                {truth.activeIngredient ? (
                  truth.activeIngredient
                ) : (
                  <NeedsVerification
                    what="activeIngredient"
                    note={
                      truth.supplierName
                        ? `The supplier calls this "${truth.supplierName}" but has not disclosed the individual actives or ratios.`
                        : undefined
                    }
                  />
                )}
              </Truth>
              <Truth label="Strength supplied">
                {truth.supplierStrength ? (
                  <>
                    {truth.supplierStrength} <span className="muted">(as listed by the supplier)</span>
                    <br />
                    <span className="small muted">A higher number on a pen does not mean it works better.</span>
                  </>
                ) : (
                  <NeedsVerification what="supplierStrength" />
                )}
              </Truth>
              <Truth label="Type of molecule">{truth.productClass || <NeedsVerification what="productClass" />}</Truth>
              <Truth label="What it does in the body">{truth.mechanism || <NeedsVerification what="mechanism" />}</Truth>
              <Truth label="What the evidence supports">{truth.evidence || <NeedsVerification what="evidence" />}</Truth>
              {truth.contentStatus && (
                <Truth label="Verification status">
                  <span className="reviewer-note">Reviewer note: {truth.contentStatus}</span>
                </Truth>
              )}
            </dl>
          </section>

          {/* Layer 4: clinical truth. Only clinician-reviewed content; the rest needs verification. */}
          <section className="info-block" data-reveal>
            <div>
              <span className="layer-label">Clinical truth</span>
              <h2 className="display">The clinical bit</h2>
            </div>
            <dl className="truth-list">
              <Truth label="Approval status">
                {clinical.approvalStatus || (
                  <NeedsVerification what="approvalStatus" note={clinical.reviewNote ? `Reviewer note: ${clinical.reviewNote}` : undefined} />
                )}
              </Truth>
              <Truth label="Local supply">{REG_STATUS[t.regulatoryStatus] ?? <NeedsVerification what="regulatoryStatus" />}</Truth>
              <Truth label="Approved indication">{clinical.approvedIndication || <NeedsVerification what="approvedIndication" />}</Truth>
              <Truth label="Who may be eligible">
                {clinical.eligibility || <NeedsVerification what="eligibility" />}
                <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
                  Whatever the criteria, PRICK only serves adults aged 18 and over, and a clinician decides after screening.
                </p>
              </Truth>
              <Truth label="Route">{clinical.route || <NeedsVerification what="route" />}</Truth>
              <Truth label="Dosing">{clinical.dosing || <NeedsVerification what="dosing" />}</Truth>
              <Truth label="Warnings">{clinical.warnings || <NeedsVerification what="warnings" />}</Truth>
              <Truth label="Contraindications">{clinical.contraindications || <NeedsVerification what="contraindications" />}</Truth>
              <Truth label="Needs clinician approval">
                {needsApproval ? 'Yes. You can only order it if a clinician approves it for you after screening.' : 'No.'}
              </Truth>
            </dl>
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
            <p>
              Your clinician sets your plan; you can&apos;t change the dose yourself. If something feels off, flag it in a
              check-in or message and it goes straight to your clinician. In an emergency call 10177.
            </p>
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
