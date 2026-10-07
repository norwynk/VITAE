'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES, feelingLine } from '@/brand/pens';
import { type BrandedPen, useCatalogue } from '@/hooks/useCatalogue';
import { PenStage } from './brand/Pen';
import { worldStyle } from './brand/worldStyle';
import { SiteNav } from './site/SiteNav';

type Step = 'intro' | 'category' | 'feeling' | 'match';

/**
 * Consumer recommendation only. The match is a starting point for screening;
 * clinical eligibility is decided by the clinician, never here.
 */
export function QuizPage() {
  const { pens, error } = useCatalogue();
  const [step, setStep] = useState<Step>('intro');
  const [category, setCategory] = useState<string | null>(null);
  const [match, setMatch] = useState<BrandedPen | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const inCategory = pens?.filter((p) => p.treatment.category === category) ?? [];
  const progress = { intro: 6, category: 40, feeling: 75, match: 100 }[step];

  if (step === 'match' && match) {
    return (
      <MatchReveal
        pen={match}
        onRestart={() => {
          setMatch(null);
          setCategory(null);
          setStep('category');
        }}
      />
    );
  }

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
                Two questions. No small talk.
              </p>
              <button type="button" onClick={() => setStep('category')}>
                Let&apos;s go
              </button>
            </section>
          )}
          {step === 'category' && (
            <section className="quiz-step" key="category" aria-labelledby="q1">
              <p className="eyebrow">Question 1 of 2</p>
              <h1 id="q1" className="display quiz__title">
                What do you want
                <br />
                more of right now?
              </h1>
              {error && <p className="notice error">The pens could not be loaded: {error}</p>}
              <div className="quiz__choices">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="quiz__choice"
                    style={{ '--choice': c.colour } as React.CSSProperties}
                    disabled={!pens}
                    onMouseEnter={() => setHover(`color-mix(in srgb, ${c.colour} 14%, var(--cream))`)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      setCategory(c.name);
                      setHover(null);
                      setStep('feeling');
                    }}
                  >
                    {c.choice}
                    <span className="dot" />
                  </button>
                ))}
              </div>
            </section>
          )}
          {step === 'feeling' && (
            <section className="quiz-step" key="feeling" aria-labelledby="q2">
              <p className="eyebrow">Question 2 of 2 · {category}</p>
              <h1 id="q2" className="display quiz__title">
                How do you
                <br />
                want to feel?
              </h1>
              <div className="quiz__choices">
                {inCategory.map(({ treatment, brand }) => (
                  <button
                    key={treatment.id}
                    type="button"
                    className="quiz__choice"
                    style={{ '--choice': brand.colours.main, '--choice-ink': brand.colours.ink } as React.CSSProperties}
                    onMouseEnter={() => setHover(`color-mix(in srgb, ${brand.colours.main} 14%, var(--cream))`)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      setMatch({ treatment, brand });
                      setHover(null);
                      setStep('match');
                    }}
                  >
                    {feelingLine(brand)}
                    <span className="dot" />
                  </button>
                ))}
              </div>
              <button type="button" className="secondary small" style={{ marginTop: 'var(--space-3)' }} onClick={() => setStep('category')}>
                Back
              </button>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

/** "you're a Sharp Mind", "you're The Glow Up", "you're an All-Day Energy". */
function withArticle(name: string) {
  if (/^the\s/i.test(name)) return name;
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

export function MatchReveal({ pen, onRestart }: { pen: BrandedPen; onRestart: () => void }) {
  const { treatment: t, brand } = pen;
  return (
    <div style={worldStyle(brand.colours)}>
      <SiteNav cta={false} />
      <main className="match" aria-live="polite">
        <div className="match__flood" />
        <div className="container match__grid">
          <div className="match__stage">
            <span className="flip-card__glow" style={{ opacity: 1 }} />
            <PenStage colours={brand.colours} label={brand.penLabel} angle={-55} fit={0.92} title={`PRICK ${t.name} pen`} />
          </div>
          <div>
            <p className="eyebrow">Your match</p>
            <h1 className="display match__title">
              Looks like
              <br />
              you&apos;re
              <br />
              {withArticle(t.name)}.
            </h1>
            <div className="match__body">
              <p className="serif-i" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15 }}>{brand.hook}</p>
              <p style={{ opacity: 0.85, maxWidth: '42ch' }}>
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
