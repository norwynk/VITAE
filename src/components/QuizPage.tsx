'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES, PEN_BRANDS } from '@/brand/pens';
import { CLINICIAN_MAY_SUGGEST, MAX_GOALS, type QuizAnswers, feelingChoices, pensIn, results, tiebreakPair } from '@/brand/quiz';
import { type BrandedPen, useCatalogue } from '@/hooks/useCatalogue';
import { PenStage } from './brand/Pen';
import { ShortlistButton } from './brand/ShortlistButton';
import { worldStyle } from './brand/worldStyle';
import { SiteNav } from './site/SiteNav';

type Step =
  | { kind: 'intro' }
  | { kind: 'goals' }
  | { kind: 'hook'; index: number }
  | { kind: 'feelings' }
  | { kind: 'tiebreak' }
  | { kind: 'result' };

const EMPTY_ANSWERS: QuizAnswers = { goals: [], hooks: {}, feelings: [] };

/**
 * Consumer recommendation only. The match is a starting point for screening;
 * clinical eligibility is decided by the clinician, never here.
 */
export function QuizPage() {
  const { pens, error } = useCatalogue();
  const [step, setStep] = useState<Step>({ kind: 'intro' });
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [hover, setHover] = useState<string | null>(null);
  const bySlug = (slug: string) => pens?.find((p) => p.treatment.slug === slug) ?? null;

  const totalSteps = 3 + Math.max(answers.goals.length, 1);
  const stepNumber = { intro: 0, goals: 1, hook: 2 + (step.kind === 'hook' ? step.index : 0), feelings: 2 + answers.goals.length, tiebreak: totalSteps, result: totalSteps }[step.kind];
  const progress = Math.max(6, Math.round((stepNumber / totalSteps) * 100));

  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep({ kind: 'goals' });
  };
  const afterFeelings = (a: QuizAnswers) => setStep(tiebreakPair(a) ? { kind: 'tiebreak' } : { kind: 'result' });

  if (step.kind === 'result') {
    const found = results(answers)
      .map((p) => bySlug(p.id))
      .filter((p): p is BrandedPen => p !== null);
    if (found.length) return <MatchReveal pen={found[0]} others={found.slice(1)} onRestart={restart} />;
  }

  const hoverOn = (colour: string) => setHover(`color-mix(in srgb, ${colour} 14%, var(--cream))`);
  const questionLabel = (n: number) => `Question ${n} of ${totalSteps - 1}`;

  return (
    <>
      <SiteNav cta={false} />
      <main className="quiz" style={{ background: hover ?? 'var(--cream)' }}>
        <div className="container narrow">
          <div className="quiz__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          {error && <p className="notice error">The pens could not be loaded: {error}</p>}

          {step.kind === 'intro' && (
            <section className="quiz-step" key="intro">
              <p className="eyebrow">Find your prick</p>
              <h1 className="display quiz__title">
                Let&apos;s find
                <br />
                your <span style={{ color: 'var(--pink)' }}>prick.</span>
              </h1>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15, margin: 'var(--space-3) 0 var(--space-4)' }}>
                A few quick questions about what you want. Your clinician handles the health side.
              </p>
              <button type="button" onClick={() => setStep({ kind: 'goals' })}>
                Let&apos;s go
              </button>
            </section>
          )}

          {step.kind === 'goals' && (
            <section className="quiz-step" key="goals" aria-labelledby="q-goals">
              <p className="eyebrow">{questionLabel(1)} · pick up to {MAX_GOALS}</p>
              <h1 id="q-goals" className="display quiz__title">
                What brings
                <br />
                you here?
              </h1>
              <div className="quiz__choices">
                {CATEGORIES.map((c) => {
                  const on = answers.goals.includes(c.name);
                  const blocked = !on && answers.goals.length >= MAX_GOALS;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      className={`quiz__choice${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      disabled={!pens || blocked}
                      style={{ '--choice': c.colour } as React.CSSProperties}
                      onMouseEnter={() => hoverOn(c.colour)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() =>
                        setAnswers((a) => ({
                          ...a,
                          goals: on ? a.goals.filter((g) => g !== c.name) : [...a.goals, c.name],
                          hooks: Object.fromEntries(Object.entries(a.hooks).filter(([g]) => g !== c.name)),
                          feelings: [],
                        }))
                      }
                    >
                      {c.choice}
                      <span className="dot" />
                    </button>
                  );
                })}
              </div>
              <div className="quiz__nav">
                <button
                  type="button"
                  disabled={!answers.goals.length}
                  onClick={() => {
                    setHover(null);
                    setStep({ kind: 'hook', index: 0 });
                  }}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {step.kind === 'hook' && (() => {
            const goal = answers.goals[step.index];
            return (
              <section className="quiz-step" key={`hook-${goal}`} aria-labelledby="q-hook">
                <p className="eyebrow">
                  {questionLabel(2 + step.index)} · {goal}
                </p>
                <h1 id="q-hook" className="display quiz__title">
                  Which sounds
                  <br />
                  most like you?
                </h1>
                <div className="quiz__choices">
                  {pensIn(goal).map((qp) => {
                    const pen = bySlug(qp.id);
                    const colour = pen?.brand.colours.main ?? 'var(--ink)';
                    return (
                      <button
                        key={qp.id}
                        type="button"
                        className="quiz__choice quiz__choice--text"
                        style={{ '--choice': colour, '--choice-ink': pen?.brand.colours.ink } as React.CSSProperties}
                        onMouseEnter={() => hoverOn(colour)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, hooks: { ...a.hooks, [goal]: qp.id } }));
                          setHover(null);
                          setStep(step.index + 1 < answers.goals.length ? { kind: 'hook', index: step.index + 1 } : { kind: 'feelings' });
                        }}
                      >
                        {qp.hook}
                        <span className="dot" />
                      </button>
                    );
                  })}
                </div>
                <div className="quiz__nav">
                  <button type="button" className="secondary small" onClick={() => setStep(step.index ? { kind: 'hook', index: step.index - 1 } : { kind: 'goals' })}>
                    Back
                  </button>
                </div>
              </section>
            );
          })()}

          {step.kind === 'feelings' && (
            <section className="quiz-step" key="feelings" aria-labelledby="q-feel">
              <p className="eyebrow">{questionLabel(2 + answers.goals.length)} · pick any</p>
              <h1 id="q-feel" className="display quiz__title">
                How do you
                <br />
                want to feel?
              </h1>
              <div className="quiz__chips">
                {feelingChoices(answers.goals).map((f) => {
                  const on = answers.feelings.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`quiz__chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => setAnswers((a) => ({ ...a, feelings: on ? a.feelings.filter((x) => x !== f) : [...a.feelings, f] }))}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
              <div className="quiz__nav">
                <button type="button" className="secondary small" onClick={() => setStep({ kind: 'hook', index: answers.goals.length - 1 })}>
                  Back
                </button>
                <button type="button" onClick={() => afterFeelings(answers)}>
                  {answers.feelings.length ? 'Show my match' : 'Skip and show my match'}
                </button>
              </div>
            </section>
          )}

          {step.kind === 'tiebreak' && (() => {
            const pair = tiebreakPair(answers);
            if (!pair) return null;
            return (
              <section className="quiz-step" key="tiebreak" aria-labelledby="q-tie">
                <p className="eyebrow">Last one · it&apos;s close</p>
                <h1 id="q-tie" className="display quiz__title">
                  Which matters
                  <br />
                  more right now?
                </h1>
                <div className="quiz__choices">
                  {pair.map((qp) => {
                    const pen = bySlug(qp.id);
                    const colour = pen?.brand.colours.main ?? 'var(--ink)';
                    return (
                      <button
                        key={qp.id}
                        type="button"
                        className="quiz__choice quiz__choice--text"
                        style={{ '--choice': colour, '--choice-ink': pen?.brand.colours.ink } as React.CSSProperties}
                        onMouseEnter={() => hoverOn(colour)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, tiebreak: qp.id }));
                          setHover(null);
                          setStep({ kind: 'result' });
                        }}
                      >
                        {qp.outcome}
                        <span className="dot" />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })()}
        </div>
      </main>
    </>
  );
}

export function MatchReveal({ pen, others = [], onRestart }: { pen: BrandedPen; others?: BrandedPen[]; onRestart: () => void }) {
  const { treatment: t, brand } = pen;
  const suggest = CLINICIAN_MAY_SUGGEST[t.slug];
  const suggestName = suggest ? PEN_BRANDS[suggest]?.penLabel : null;
  return (
    <div style={worldStyle(brand.colours)}>
      <SiteNav cta={false} />
      <main className="match" aria-live="polite">
        <div className="match__flood" />
        <div className="container match__grid">
          <div className="match__stage">
            <span className="flip-card__glow" style={{ opacity: 1 }} />
            <PenStage colours={brand.colours} label={brand.penLabel} botanical={brand.botanical} angle={-55} fit={0.92} title={`PRICK ${t.name} pen`} />
          </div>
          <div>
            <h1 className="match__title">
              <span className="match__kicker">Your match:</span>
              <span className="display match__name">{t.name}.</span>
            </h1>
            <div className="match__body">
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15 }}>{brand.hook}</p>
              <p style={{ opacity: 0.85, maxWidth: '42ch' }}>
                This is a match, not a prescription. Next comes a private health screening, then a clinician decides
                whether it&apos;s right for you.
              </p>
              {suggestName && (
                <p className="small" style={{ opacity: 0.85, maxWidth: '42ch' }}>
                  Your clinician may suggest {titleCase(suggestName)} instead.
                </p>
              )}
              <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <ShortlistButton slug={t.slug} name={t.name} className="btn light" />
                <Link href={`/app?pen=${t.slug}`} className="btn ghost" style={{ color: 'inherit' }}>
                  Start your screening
                </Link>
              </div>
              {others.length > 0 && (
                <div className="match__others">
                  <p className="eyebrow">Also worth asking your clinician about</p>
                  <ul className="plain">
                    {others.map((o) => (
                      <li key={o.treatment.id} className="match__other">
                        <span className="match__other-dot" style={{ background: o.brand.colours.main }} />
                        <Link href={`/pens/${o.treatment.slug}`} className="match__other-name">
                          {o.treatment.name}
                        </Link>
                        <ShortlistButton slug={o.treatment.slug} name={o.treatment.name} className="btn small light" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <Link href={`/pens/${t.slug}`} className="link-arrow">
                  Meet {t.name}
                </Link>
                <button type="button" className="secondary small" style={{ color: 'inherit' }} onClick={onRestart}>
                  Start over
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function titleCase(label: string) {
  return label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
