'use client';
import Link from 'next/link';
import { useState } from 'react';
import { GOALS, type GoalKey, matchForGoal } from '@/brand/pens';
import { type BrandedPen, useCatalogue } from '@/hooks/useCatalogue';
import { Pen } from './brand/Pen';
import { worldStyle } from './brand/worldStyle';
import { SiteNav } from './site/SiteNav';

type Step = 'intro' | 'goal' | 'match';

/**
 * Consumer recommendation only. The match is a starting point for screening;
 * clinical eligibility is decided by the clinician, never here.
 */
export function QuizPage() {
  const { pens, error } = useCatalogue();
  const [step, setStep] = useState<Step>('intro');
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const match = goal && pens ? pens.find((p) => p.treatment.id === matchForGoal(goal, pens.map((x) => x.treatment))?.id) : undefined;
  const progress = step === 'intro' ? 8 : step === 'goal' ? 50 : 100;

  if (step === 'match' && match) return <MatchReveal pen={match} onRestart={() => { setGoal(null); setStep('goal'); }} />;

  return (
    <>
      <SiteNav cta={false} />
      <main className="quiz" style={{ background: hover ?? 'var(--cream)' }}>
        <div className="container narrow">
          <div className="quiz__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          {step === 'intro' && (
            <section className="quiz-step" key="intro">
              <p className="eyebrow">Find your prick</p>
              <h1 className="display quiz__title">
                Let&apos;s find
                <br />
                your <span style={{ color: 'var(--pink)' }}>prick.</span>
              </h1>
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15, margin: 'var(--space-3) 0 var(--space-4)' }}>
                One question. No small talk.
              </p>
              <button type="button" onClick={() => setStep('goal')}>
                Let&apos;s go
              </button>
            </section>
          )}
          {step === 'goal' && (
            <section className="quiz-step" key="goal" aria-labelledby="goal-q">
              <p className="eyebrow">Question 1 of 1</p>
              <h1 id="goal-q" className="display quiz__title">
                What do you want
                <br />
                more of right now?
              </h1>
              {error && <p className="notice error">The pens could not be loaded: {error}</p>}
              <div className="quiz__choices">
                {GOALS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className="quiz__choice"
                    style={{ '--choice': g.colour, '--choice-ink': g.key === 'sharper' ? '#132000' : '#fff' } as React.CSSProperties}
                    disabled={!pens}
                    onMouseEnter={() => setHover(`color-mix(in srgb, ${g.colour} 14%, var(--cream))`)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      setGoal(g.key);
                      setHover(null);
                      setStep('match');
                    }}
                  >
                    {g.choice}
                    <span className="dot" />
                  </button>
                ))}
              </div>
              {step === 'goal' && goal && !match && pens && <p className="muted">No pen in the range matches that yet.</p>}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function article(name: string) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

export function MatchReveal({ pen, onRestart }: { pen: BrandedPen; onRestart: () => void }) {
  const { treatment: t, brand } = pen;
  return (
    <div style={worldStyle(brand.colours)}>
      <SiteNav cta={false} />
      <main className="match" aria-live="polite">
        <div className="match__flood" />
        <div className="container match__grid">
          <Pen colours={brand.colours} label={brand.penLabel} className="match__pen" title={`PRICK ${t.name} pen`} />
          <div>
            <p className="eyebrow">Your match</p>
            <h1 className="display match__title">
              Looks like
              <br />
              you&apos;re {article(t.name)}
              <br />
              {t.name}.
            </h1>
            <div className="match__body">
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15 }}>
                {brand.statement[0]} {brand.statement[1]}
              </p>
              <p style={{ opacity: 0.85, maxWidth: '40ch' }}>
                This is a match, not a prescription. Next comes a private health screening, then a clinician decides
                whether it&apos;s right for you.
              </p>
              <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <Link href={`/app?pen=${t.slug}`} className="btn light">
                  Start your screening
                </Link>
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
