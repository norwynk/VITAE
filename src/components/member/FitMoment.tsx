'use client';
import type { Goal } from '@/brand/goals';
import { salesOpen } from '@/config';

/**
 * The arrival: their own words played back, what happens next, and an honest
 * read of their answers. It never approves anything; a clinician makes the
 * call. `needsLook` softens the message when an answer is flagged.
 */
export function FitMoment({
  goal,
  firstName = '',
  vision = '',
  needsLook,
  tooYoung,
  repeat = false,
}: {
  repeat?: boolean;
  goal?: Goal;
  firstName?: string;
  vision?: string;
  needsLook: boolean;
  tooYoung: boolean;
}) {
  const you = firstName ? `, ${firstName}` : '';
  return (
    <section
      className="fit"
      style={{ '--accent': goal?.colour ?? 'var(--pink)' } as React.CSSProperties}
      aria-labelledby="fit-title"
    >
      <p className="eyebrow">{repeat ? 'Repeat your script' : goal ? `Your route to ${goal.destination}` : 'Before you send it'}</p>
      {tooYoung ? (
        <>
          <h2 id="fit-title" className="display">We can&apos;t send this one.</h2>
          <p className="fit__lead">PRICK is only for adults aged 18 and over. Check your date of birth under About you.</p>
        </>
      ) : repeat ? (
        <>
          <h2 id="fit-title" className="display">
            Your script is ready to send{you}.
            <span className="serif-i">Your clinician verifies it before anything is released.</span>
          </h2>
          <p className="fit__lead">
            They&apos;ll check your protocol and safety answers, and usually give you a quick call. Have a copy of your script
            handy: they&apos;ll ask for it.
          </p>
        </>
      ) : needsLook ? (
        <>
          <h2 id="fit-title" className="display">
            Thanks for being so open{you}.
            <span className="serif-i">Your clinician will take a closer look.</span>
          </h2>
          <p className="fit__lead">
            A few of your answers need a clinician&apos;s eye. That&apos;s exactly what they&apos;re here for, and it doesn&apos;t mean no.
          </p>
        </>
      ) : (
        <>
          <h2 id="fit-title" className="display">
            You look like a good fit{you}.
            <span className="serif-i">Now a clinician makes the call.</span>
          </h2>
          <p className="fit__lead">Your answers are ready to send. Your clinician may ask you a question or two before they decide.</p>
        </>
      )}
      {vision && !tooYoung && (
        <blockquote className="fit__vision">
          <span className="eyebrow">In your words</span>“{vision}”
        </blockquote>
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
            <span>Their decision appears in your account.</span>
          </li>
          <li>
            <strong>If approved</strong>
            <span>{salesOpen() ? 'Your next steps appear in your account.' : 'Your care team arranges the next steps with you.'}</span>
          </li>
        </ol>
      )}
    </section>
  );
}
