import Link from 'next/link';
import type { ReactNode } from 'react';
import { RoyalPrick } from './RoyalPrick';

/** Public sections: how people feel, doctors and care. Treatments are only ever discussed inside the account. */
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
  { title: 'Tell us what’s going on.', body: 'A private health assessment on your phone. How you feel, your history and what you’d like help with.', colour: 'var(--pink)' },
  { title: 'A clinician reads every word.', body: 'A real person goes through your answers and picks up the phone if they need to know more.', colour: 'var(--orange)' },
  { title: 'You get a straight answer.', body: 'Yes, no or not yet. If something could help, they talk you through it. If nothing is right for you, they say so.', colour: 'var(--blue)' },
  { title: 'We don’t ghost.', body: 'Check-ins, reminders and a clinician to message, all in your own private account.', colour: 'var(--lime)' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <div className="steps section" style={{ paddingInline: 'var(--gutter)' }}>
          <div className="section-head" data-reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="display">
              Let&apos;s get to know
              <br />
              each other first.
            </h2>
          </div>
          <ol className="steps__grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s.title} className="step" data-reveal style={{ '--delay': `${i * 120}ms`, '--step-colour': s.colour } as React.CSSProperties}>
                <div className="step__num">0{i + 1}</div>
                <h3>{s.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="steps__cta" data-reveal>
            <Link href="/start" className="btn steps__btn">
              Start your assessment
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  { title: "Don't take pricks from strangers.", body: 'A clinician assigned to you, in your own private account. Not a stranger in your DMs.', colour: 'var(--pink)' },
  { title: 'A prick with standards.', body: 'Every answer read. Every decision explained.', colour: 'var(--orange)' },
  { title: 'Made to measure.', body: 'Your clinician looks at you, not a template. It is personal, not a one-size pack.', colour: 'var(--blue)' },
  { title: "We don't ghost.", body: 'Reminders, check-ins and booked follow-ups. Flag a concern and it goes straight to your clinician.', colour: 'var(--lime)' },
  { title: 'What happens here stays here.', body: 'Your health details are seen by your clinician, not by delivery or support staff.', colour: 'var(--sky)' },
  { title: 'No yes, no prick.', body: 'Everything starts with a private health assessment, and nothing happens without a clinician saying yes.', colour: 'var(--blush)' },
];

export function ClinicalTrustPanel() {
  return (
    <section className="trust section">
      <div className="container">
        <h2 className="display" data-reveal>
          We don&apos;t mess around
          <br />
          with this part.
          <br />
          <span className="serif-i">Fun on the outside. Serious where it matters.</span>
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

export function FinalCta() {
  return (
    <section className="final-cta section">
      <div className="container">
        <h2 className="display" data-reveal>
          So.
          <br />
          What&apos;s <span className="pop">going</span>
          <br />
          on with you?
        </h2>
        <div style={{ marginTop: 'var(--space-4)' }} data-reveal>
          <Link href="/start" className="btn light">
            Start your assessment
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Category stance: PRICK is designed for women. A positioning choice about who
 * it is built around, not an identity or empowerment statement.
 */
export function DesignedForWomen() {
  return (
    <section className="women section">
      <div className="container women__grid">
        <div data-reveal>
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="display women__title">
            A prick that
            <br />
            gets her.
            <span className="serif-i">Designed for women. Built around your body and your rhythm.</span>
          </h2>
          <p className="women__body">
            From the colours to the questions in your assessment, PRICK is shaped around women: your cycle, pregnancy,
            breastfeeding and life stage all count, so your clinician gets the full picture.
          </p>
        </div>
        <div className="women__side" data-reveal style={{ '--delay': '150ms' } as React.CSSProperties}>
          <RoyalPrick className="women__royal" />
        </div>
      </div>
    </section>
  );
}

/** The men's side: the same standards. Mirrors DesignedForWomen so both sides feel like one brand. */
export function BuiltForMen() {
  return (
    <section className="women section">
      <div className="container women__grid">
        <div data-reveal>
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="display women__title">
            A prick that
            <br />
            gets him.
            <span className="serif-i">Built for men. No lectures.</span>
          </h2>
          <p className="women__body">
            Your assessment includes questions just for men, so your clinician gets the full picture before anything is decided.
          </p>
        </div>
        <div className="women__side" data-reveal style={{ '--delay': '150ms' } as React.CSSProperties}>
          <RoyalPrick className="women__royal" />
        </div>
      </div>
    </section>
  );
}
