'use client';
import Link from 'next/link';
import { BySide } from './brand/BySide';
import { ConsultCard } from './brand/ConsultCard';
import { useState } from 'react';
import type { Treatment } from '@/domain/model';
import { CATEGORIES, PEN_BRANDS, feelingLine } from '@/brand/pens';
import { CLINICIAN_MAY_SUGGEST, MAX_GOALS, QUIZ_PENS, type QuizAnswers, feelingChoices, goalsToAsk, pensIn, results, tiebreakPair, withOnlyPens } from '@/brand/quiz';
import { MEN_ANGLES, MEN_CHOICES, forSide } from '@/brand/sides';
import { useSide } from '@/hooks/useSide';
import { type BrandedPen, useCatalogue } from '@/hooks/useCatalogue';
import { PenStage } from './brand/Pen';
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
export function QuizPage({ initialGoal, initialPens }: { initialGoal?: string; initialPens?: Treatment[] } = {}) {
  const { pens, error } = useCatalogue(initialPens);
  // The men's side is matched to the men's range only, and only offers goals it has pens for.
  const { side } = useSide();
  // The men's side also asks in the men's words (hooks, outcomes, feelings).
  const pool = forSide(QUIZ_PENS, side, (p) => p.id).map((p) => {
    const men = side === 'men' ? MEN_ANGLES[p.id] : undefined;
    return men ? { ...p, hook: men.hook, outcome: men.outcome, feeling: men.feeling } : p;
  });
  const categories = CATEGORIES.filter((c) => pool.some((p) => p.category === c.name));
  // Arriving from a homepage goal card: that goal is chosen, so start at the next question.
  const [step, setStep] = useState<Step>(initialGoal ? { kind: 'hook', index: 0 } : { kind: 'intro' });
  const [answers, setAnswers] = useState<QuizAnswers>(initialGoal ? { ...EMPTY_ANSWERS, goals: [initialGoal] } : EMPTY_ANSWERS);
  const [hover, setHover] = useState<string | null>(null);
  const bySlug = (slug: string) => pens?.find((p) => p.treatment.slug === slug) ?? null;
  // A goal with only one pen has nothing to choose between, so it skips straight past its question.
  const hookGoals = goalsToAsk(answers.goals, pool);
  const full = withOnlyPens(answers, pool);
  const view: Step = step.kind === 'hook' && !hookGoals[step.index] ? { kind: 'feelings' } : step;

  const asked = answers.goals.length ? hookGoals.length : 1;
  const totalSteps = 3 + asked;
  const stepNumber = { intro: 0, goals: 1, hook: 2 + (view.kind === 'hook' ? view.index : 0), feelings: 2 + asked, tiebreak: totalSteps, result: totalSteps }[view.kind];
  const progress = Math.max(6, Math.round((stepNumber / totalSteps) * 100));

  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep({ kind: 'goals' });
  };
  const afterFeelings = (a: QuizAnswers) => setStep(tiebreakPair(withOnlyPens(a, pool), pool) ? { kind: 'tiebreak' } : { kind: 'result' });

  if (view.kind === 'result') {
    const found = results(full, pool)
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

          {view.kind === 'intro' && (
            <section className="quiz-step" key="intro">
              <p className="eyebrow">Find your prick</p>
              <h1 className="display quiz__title">
                Have you met
                <br />
                your <span style={{ color: 'var(--pink)' }}>prick?</span>
              </h1>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15, margin: 'var(--space-3) 0 var(--space-4)' }}>
                A few quick questions about what you are after. No health questions yet: that part is for your clinician.
              </p>
              <button type="button" onClick={() => setStep({ kind: 'goals' })}>
                Let&apos;s go
              </button>
            </section>
          )}

          {view.kind === 'goals' && (
            <section className="quiz-step" key="goals" aria-labelledby="q-goals">
              <p className="eyebrow">{questionLabel(1)} · pick up to {MAX_GOALS}</p>
              <h1 id="q-goals" className="display quiz__title">
                What are
                <br />
                you after?
              </h1>
              <div className="quiz__choices">
                {categories.map((c) => {
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
                      <BySide women={c.choice} men={MEN_CHOICES[c.name]} />
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
                    setStep(hookGoals.length ? { kind: 'hook', index: 0 } : { kind: 'feelings' });
                  }}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {view.kind === 'hook' && (() => {
            const goal = hookGoals[view.index];
            return (
              <section className="quiz-step" key={`hook-${goal}`} aria-labelledby="q-hook">
                <p className="eyebrow">
                  {questionLabel(2 + view.index)} · {goal}
                </p>
                <h1 id="q-hook" className="display quiz__title">
                  Which sounds
                  <br />
                  most like you?
                </h1>
                <div className="quiz__choices">
                  {pensIn(goal, pool).map((qp) => {
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
                          setStep(view.index + 1 < hookGoals.length ? { kind: 'hook', index: view.index + 1 } : { kind: 'feelings' });
                        }}
                      >
                        {qp.hook}
                        <span className="dot" />
                      </button>
                    );
                  })}
                </div>
                <div className="quiz__nav">
                  <button type="button" className="secondary small" onClick={() => setStep(view.index ? { kind: 'hook', index: view.index - 1 } : { kind: 'goals' })}>
                    Back
                  </button>
                </div>
              </section>
            );
          })()}

          {view.kind === 'feelings' && (
            <section className="quiz-step" key="feelings" aria-labelledby="q-feel">
              <p className="eyebrow">{questionLabel(2 + asked)} · pick any</p>
              <h1 id="q-feel" className="display quiz__title">
                How do you
                <br />
                want to feel?
              </h1>
              <div className="quiz__chips">
                {feelingChoices(answers.goals, pool).map((f) => {
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
                <button type="button" className="secondary small" onClick={() => setStep(hookGoals.length ? { kind: 'hook', index: hookGoals.length - 1 } : { kind: 'goals' })}>
                  Back
                </button>
                <button type="button" onClick={() => afterFeelings(answers)}>
                  {answers.feelings.length ? 'Show my match' : 'Skip and show my match'}
                </button>
              </div>
            </section>
          )}

          {view.kind === 'tiebreak' && (() => {
            const pair = tiebreakPair(full, pool);
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
          {/* The pen itself opens its page: look first, screening when ready. */}
          <Link href={`/pens/${t.slug}`} className="match__stage" aria-label={`See ${t.name}`}>
            <span className="flip-card__glow" style={{ opacity: 1 }} />
            <PenStage colours={brand.colours} label={brand.penLabel} botanical={brand.botanical} angle={-55} fit={0.92} title={`PRICK ${t.name} pen`} />
          </Link>
          <div>
            <h1 className="match__title">
              <span className="match__kicker">Your match:</span>
              <span className="display match__name">{t.name}.</span>
            </h1>
            <div className="match__body">
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15 }}><BySide women={brand.hook} men={MEN_ANGLES[t.slug]?.hook} /></p>
              <p style={{ maxWidth: '42ch', fontWeight: 600 }}><BySide women={brand.outcome} men={MEN_ANGLES[t.slug]?.outcome} /></p>
              <p className="match__feeling"><BySide women={feelingLine(brand)} men={MEN_ANGLES[t.slug] && feelingLine(MEN_ANGLES[t.slug])} /></p>
              <p style={{ opacity: 0.85, maxWidth: '42ch' }}>
                This is a match, not a prescription. Next comes a private health screening, then a clinician decides
                whether it&apos;s right for you.
              </p>
              {suggestName && (
                <p className="small" style={{ opacity: 0.85, maxWidth: '42ch' }}>
                  Your clinician may suggest {titleCase(suggestName)} instead.
                </p>
              )}
              <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
                <Link href={`/app?pen=${t.slug}`} className="btn light">
                  Ask my clinician
                </Link>
                <Link href={`/pens/${t.slug}`} className="btn ghost">
                  See the pen
                </Link>
              </div>
              {t.category === 'Weight & Body' && <ConsultCard variant="inline" />}
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
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="link-arrow match__restart" onClick={onRestart}>
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
