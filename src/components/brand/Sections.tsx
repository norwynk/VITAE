import Link from 'next/link';
import type { ReactNode } from 'react';
import { CO_FOUNDERS } from '@/brand/team';
import { PEN_BRANDS } from '@/brand/pens';
import { Motif } from './Botanicals';
import { PenStage } from './Pen';

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
          <div className="steps__cta" data-reveal>
            <Link href="/app" className="btn steps__btn">
              Start your assessment
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Decorative line-up for the "good days" band, fanned like a product shot. */
const LINEUP = [
  { slug: 'the-glow-up', angle: -96, lift: '6%' },
  { slug: 'total-body-reset', angle: -90, lift: '0%' },
  { slug: 'body-sculpt', angle: -80, lift: '-6%' },
  { slug: 'all-day-energy', angle: -68, lift: '-2%' },
].map((p) => ({ ...p, brand: PEN_BRANDS[p.slug] }));

/**
 * Pens fanned on a pastel band with the headline and quiz button beside them.
 * Copy stays factual: clinician-decided, used privately at home.
 */
export function LifestylePanel() {
  return (
    <section className="good-days">
      <div className="container good-days__inner">
        <div className="good-days__pens" aria-hidden="true">
          {LINEUP.map((p) => (
            <div key={p.slug} className="good-days__pen" style={{ '--lift': p.lift } as React.CSSProperties}>
              <PenStage colours={p.brand.colours} label={p.brand.penLabel} botanical={p.brand.botanical} angle={p.angle} fit={0.98} />
            </div>
          ))}
        </div>
        <div className="good-days__copy" data-reveal>
          <h2 className="display">Good days look different on everyone.</h2>
          <p>
            Fifteen pens for fifteen different goals. Your clinician decides which one is right for you, and you use it
            privately at home, on the plan they set.
          </p>
          <Link href="/find-your-prick" className="btn">
            Find your Prick
          </Link>
        </div>
      </div>
      <svg className="good-days__wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80 V48 C240 8 480 0 720 28 C960 56 1200 64 1440 20 V80 Z" />
      </svg>
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
                <PenStage key={b.slug} colours={b.colours} label={b.penLabel} botanical={b.botanical} angle={angles[i]} fit={0.95} />
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
            <PenStage key={b.slug} colours={b.colours} label={b.penLabel} botanical={b.botanical} angle={i % 2 ? -84 : -96} fit={0.95} />
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
  return (
    <section className="women section">
      <div className="container women__grid">
        <div data-reveal>
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="display women__title">
            Designed
            <br />
            for women.
            <span className="serif-i">Built around your goals, your body and your rhythm.</span>
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
              <PenStage key={b.slug} colours={b.colours} label={b.penLabel} botanical={b.botanical} angle={[-84, -90, -96][i]} fit={1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Co-founder quote, two halves: her photo with a handwritten name on the
 * left, the quote on a pastel panel on the right.
 */
export function CoFounderQuote() {
  const founder = CO_FOUNDERS.find((f) => f.quote && f.photo);
  if (!founder?.photo || !founder.quote) return null;
  const glow = PEN_BRANDS['the-glow-up'].colours;
  const citrus = PEN_BRANDS['holiday-tan'].colours;
  return (
    <section className="founder-quote" aria-label={`A word from ${founder.name}`}>
      <div className="founder-quote__photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={founder.photo} alt={founder.name} width={494} height={1172} />
        <p className="founder-quote__hand" aria-hidden="true">
          {founder.handle},
          <br />
          <span>Co-Founder</span>
        </p>
        <svg className="founder-quote__arrow" viewBox="0 0 120 90" aria-hidden="true">
          <path d="M6 10 C40 4 82 18 96 66" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M82 58 L97 70 L104 52" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="founder-quote__panel" data-reveal>
        {/* Decoration pinned to the panel's corners so it never crops or stretches. */}
        {(
          [
            ['berry', glow, 'tl', -18],
            ['blossom', glow, 'tr', 20],
            ['citrus', citrus, 'br', 12],
          ] as const
        ).map(([kind, colours, corner, rotate]) => (
          <svg key={corner} className={`founder-quote__decor founder-quote__decor--${corner}`} viewBox="-50 -50 100 100" aria-hidden="true">
            <Motif kind={kind} colours={colours} x={0} y={0} size={40} rotate={rotate} />
          </svg>
        ))}
        {['s1', 's2', 's3'].map((k) => (
          <svg key={k} className={`founder-quote__spark founder-quote__spark--${k}`} viewBox="-10 -10 20 20" aria-hidden="true">
            <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill="#fff" />
          </svg>
        ))}
        <blockquote className="founder-quote__text">
          <p>{founder.quote}</p>
          <footer>– {founder.name}, Co-Founder of PRICK</footer>
        </blockquote>
        <Link href="/about" className="btn founder-quote__btn">
          About us
        </Link>
      </div>
    </section>
  );
}
