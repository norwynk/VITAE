import Link from 'next/link';
import type { ReactNode } from 'react';
import { CO_FOUNDERS } from '@/brand/team';
import { PEN_BRANDS } from '@/brand/pens';
import { PenStage } from './Pen';
import { PhotoSlot } from './PhotoSlot';

const FINALE = ['the-glow-up', 'total-body-reset', 'deep-sleep-rebuild', 'all-day-energy', 'sharp-mind', 'body-sculpt'].map((slug) => PEN_BRANDS[slug]);

export function EditorialStatement({ top, bottom, children }: { top: string; bottom: string; children?: ReactNode }) {
  return (
    <section className="statement container">
      <h2 className="statement__big" data-reveal>
        <span className="split-line"><span>{top}</span></span>
        <span className="serif-i split-line"><span style={{ '--delay': '150ms' } as React.CSSProperties}>{bottom}</span></span>
      </h2>
      {children && <div className="statement__small" data-reveal style={{ '--delay': '300ms' } as React.CSSProperties}>{children}</div>}
    </section>
  );
}

const STEPS = [
  { title: 'Pick what you want to transform.', body: 'Glow, energy, sleep or focus. Start with the feeling, not the formula.' },
  { title: 'Complete your health screening.', body: 'A private questionnaire about your health, history and goals.' },
  { title: 'Clinical review.', body: 'A clinician reads your screening and decides what is right for you, if anything.' },
  { title: 'Your personalised path begins.', body: 'If you are approved, your plan, reminders and check-ins live in your account.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <div className="steps section" style={{ paddingInline: 'var(--gutter)' }}>
          <div className="section-head" data-reveal>
            <h2 className="display">
              How it
              <br />
              works.
            </h2>
            <p className="serif-i" style={{ fontSize: 'var(--step-2)', maxWidth: '18ch', margin: 0 }}>
              Fun to pick. Properly checked.
            </p>
          </div>
          <ol className="steps__grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s.title} className="step" data-reveal style={{ '--delay': `${i * 120}ms`, '--step-colour': FINALE[i]?.colours.main } as React.CSSProperties}>
                <div className="step__num">0{i + 1}</div>
                <h3>{s.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const MOMENTS = [
  { caption: 'Mornings', brief: 'Bathroom vanity at sunrise, pink pen beside a glass of water and gold earrings, hard window light.', pen: 'the-glow-up', tilt: 18 },
  { caption: 'Training', brief: 'Gym bag on court-side bench, orange pen next to a sweaty water bottle, hard sun.', pen: 'total-body-reset', tilt: -14 },
  { caption: 'Work', brief: 'Desk with laptop and chrome lamp, lime pen beside AirPods case, clean daylight.', pen: 'sharp-mind', tilt: 26 },
  { caption: 'Travel', brief: 'Open carry-on with linen shirt and sunglasses, pink pen tucked in a pocket, poolside light.', pen: 'the-glow-up', tilt: -22 },
  { caption: 'Sleep', brief: 'Bedside table at dusk, blue pen next to lavender and a book, cool evening light.', pen: 'deep-sleep-rebuild', tilt: 12 },
];

export function LifestylePanel() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head" data-reveal>
          <h2 className="display">
            Good days look
            <br />
            different on
            <br />
            everyone.
          </h2>
          <p style={{ maxWidth: '32ch', margin: 0 }}>Small pen. Big plans. It fits in a bag, a pocket or the corner of your vanity.</p>
        </div>
        <div className="lifestyle__grid">
          {MOMENTS.map((m, i) => (
            <div key={m.caption} data-reveal style={{ '--delay': `${i * 80}ms` } as React.CSSProperties}>
              <PhotoSlot brand={PEN_BRANDS[m.pen]} brief={m.brief} caption={m.caption} tilt={m.tilt} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Only claims the platform actually supports today. Add "licensed providers"
 * and "quality-controlled supply" here only once they are verified and agreed.
 */
const TRUST = [
  { title: 'Health screening first', body: 'Nothing is offered until you have completed a private health screening.', colour: 'var(--pink)' },
  { title: 'A clinician reviews every request', body: 'A clinician assigned to you reads your screening and makes the call.', colour: 'var(--orange)' },
  { title: 'Plans set for you', body: 'If approved, your clinician sets the plan. It is personal, not a one-size pack.', colour: 'var(--blue)' },
  { title: 'Check-ins and follow-ups', body: 'Reminders, check-ins and booked follow-ups. Flag a concern and it goes straight to your clinician.', colour: 'var(--lime)' },
  { title: 'Private by design', body: 'Your health details are seen by your clinician, not by delivery or support staff.', colour: 'var(--sky)' },
  { title: 'No approval, no order', body: 'You cannot order a pen that a clinician has not approved for you.', colour: 'var(--blush)' },
];

export function ClinicalTrustPanel() {
  return (
    <section className="trust section">
      <div className="container">
        <h2 className="display" data-reveal>
          Fun on the outside.
          <br />
          <span className="serif-i">Serious where it matters.</span>
        </h2>
        <div className="trust__grid">
          {TRUST.map((t, i) => (
            <div key={t.title} className="trust__item" data-reveal style={{ '--delay': `${(i % 3) * 100}ms` } as React.CSSProperties}>
              <div className="trust__dot" style={{ background: t.colour }} />
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** PLACEHOLDER: no real reviews exist yet. Never replace with invented quotes. */
export function ReviewCard({ colour }: { colour: string }) {
  return (
    <article className="review-card" data-placeholder="review">
      <p className="serif-i">Real reviews from real members will live here.</p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow muted">Review placeholder</span>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: colour }} />
      </div>
    </article>
  );
}

export function Reviews() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head" data-reveal>
          <h2 className="display">
            Real people.
            <br />
            More good days.
          </h2>
          <p className="hand" style={{ margin: 0 }}>coming soon, honestly</p>
        </div>
        <div className="reviews__grid">
          {['var(--pink)', 'var(--blue)', 'var(--lime)'].map((c, i) => (
            <div key={c} data-reveal style={{ '--delay': `${i * 100}ms` } as React.CSSProperties}>
              <ReviewCard colour={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SubscriptionPanel() {
  const trio = [PEN_BRANDS['deep-sleep-rebuild'], PEN_BRANDS['the-glow-up'], PEN_BRANDS['total-body-reset']];
  const angles = [-72, -90, -108];
  return (
    <section className="section">
      <div className="container">
        <div className="repeat section" style={{ paddingInline: 'var(--gutter)' }}>
          <div className="repeat__grid">
            <div className="repeat__pens" data-reveal>
              {trio.map((b, i) => (
                <PenStage key={b.slug} colours={b.colours} label={b.penLabel} angle={angles[i]} fit={0.95} />
              ))}
            </div>
            <div data-reveal style={{ '--delay': '150ms', '--accent': 'var(--pink)' } as React.CSSProperties}>
              <h2 className="display">
                Your prick.
                <br />
                On repeat.
              </h2>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.1 }}>
                Less like a refill. More like a membership.
              </p>
              <ul className="checklist">
                <li>Dose reminders at a time that suits you</li>
                <li>Check-ins whenever something feels off</li>
                <li>Follow-ups booked by your clinician</li>
                <li>Your plan, orders and messages in one place</li>
              </ul>
              {/* Recurring delivery is not supported by the backend yet. */}
              <p className="small muted">Automatic repeat delivery is coming soon. For now, you reorder in a tap once you&apos;re approved.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="final-cta section">
      <div className="container">
        <h2 className="display" data-reveal>
          So.
          <br />
          Which <span className="pop">prick</span>
          <br />
          are you?
        </h2>
        <div style={{ marginTop: 'var(--space-4)' }} data-reveal>
          <Link href="/find-your-prick" className="btn light">
            Find your prick
          </Link>
        </div>
        <div className="final-cta__pens" data-reveal>
          {FINALE.map((b, i) => (
            <PenStage key={b.slug} colours={b.colours} label={b.penLabel} angle={i % 2 ? -84 : -96} fit={0.95} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Category stance: PRICK is designed for women. A positioning choice about who
 * the range is built around, not an identity or empowerment statement.
 */
export function DesignedForWomen() {
  const trio = ['the-glow-up', 'hormone-reset', 'skin-rewind'].map((slug) => PEN_BRANDS[slug]);
  const withPhoto = CO_FOUNDERS.find((f) => f.photo);
  return (
    <section className="women section">
      <div className="container women__grid">
        <div data-reveal>
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="display women__title">
            Designed
            <br />
            for women.
            <span className="serif-i">Built around her goals, her body and her rhythm.</span>
          </h2>
          <p className="women__body">
            From the colours to the questions in your screening, PRICK is shaped around women: your cycle, pregnancy,
            breastfeeding and life stage all count, so your clinician gets the full picture.
          </p>
          {/* Slot for the founders' "why we exist" copy, to be supplied. Nothing renders until then. */}
        </div>
        <div className="women__side" data-reveal style={{ '--delay': '150ms' } as React.CSSProperties}>
          <div className="women__pens" aria-hidden="true">
            {trio.map((b, i) => (
              <PenStage key={b.slug} colours={b.colours} label={b.penLabel} angle={[-70, -90, -110][i]} fit={0.95} />
            ))}
          </div>
          {withPhoto?.photo && (
            <figure className="cofounders">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cofounders__photo" src={withPhoto.photo} alt={withPhoto.name} width={120} height={288} />
              <figcaption className="cofounders__name">{withPhoto.name}</figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
