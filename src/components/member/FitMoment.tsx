'use client';
import { penBrand } from '@/brand/pens';
import type { Treatment } from '@/domain/model';
import { worldStyle } from '../brand/worldStyle';

/**
 * The moment before consent: the member's pens, what happens next, and an
 * honest read of their answers. It never approves anything; a clinician
 * makes the call. `needsLook` softens the message when an answer is flagged.
 */
export function FitMoment({ pens, needsLook, tooYoung }: { pens: Treatment[]; needsLook: boolean; tooYoung: boolean }) {
  const first = pens[0] ? penBrand(pens[0]) : null;
  return (
    <section className="fit" style={first ? worldStyle(first.colours) : ({ '--accent': 'var(--pink)' } as React.CSSProperties)} aria-labelledby="fit-title">
      <p className="eyebrow">Before you send it</p>
      {tooYoung ? (
        <>
          <h2 id="fit-title" className="display">We can&apos;t send this one.</h2>
          <p className="fit__lead">PRICK is only for adults aged 18 and over. Check your date of birth under About you.</p>
        </>
      ) : needsLook ? (
        <>
          <h2 id="fit-title" className="display">
            Thanks for being so open.
            <span className="serif-i">Your clinician will take a closer look.</span>
          </h2>
          <p className="fit__lead">
            A few of your answers need a clinician&apos;s eye. That&apos;s exactly what they&apos;re here for, and it doesn&apos;t mean no.
          </p>
        </>
      ) : (
        <>
          <h2 id="fit-title" className="display">
            You look like a good fit.
            <span className="serif-i">Now a clinician makes the call.</span>
          </h2>
          <p className="fit__lead">Your answers are ready to send. Your clinician may ask you a question or two before they decide.</p>
        </>
      )}
      {pens.length > 0 && (
        <ul className="plain fit__pens">
          {pens.map((t) => (
            <li key={t.id} style={worldStyle(penBrand(t).colours)}>
              <span className="screening__pen-dot" /> {t.name}
            </li>
          ))}
        </ul>
      )}
      {!tooYoung && (
        <ol className="fit__timeline">
          <li>
            <strong>Today</strong>
            <span>You send your screening.</span>
          </li>
          <li>
            <strong>Next</strong>
            <span>Your clinician reads every answer.</span>
          </li>
          <li>
            <strong>Then</strong>
            <span>Their decision appears here, in your account.</span>
          </li>
          <li>
            <strong>If approved</strong>
            <span>Order your pen. We check in before it runs out.</span>
          </li>
        </ol>
      )}
    </section>
  );
}
