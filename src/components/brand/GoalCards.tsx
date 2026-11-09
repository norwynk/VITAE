import Link from 'next/link';
import { GOALS } from '@/brand/goals';
import { MEN_GOALS } from '@/brand/sides';

const Head = () => (
  <div className="section-head" data-reveal>
    <div>
      <p className="eyebrow">Start here</p>
      <h2 id="goals-title" className="display">
        What&apos;s
        <br />
        going on?
      </h2>
    </div>
    <p className="goals__lead">Pick one. A private assessment, then a clinician takes it from there.</p>
  </div>
);

/** "Start here": what's bothering them, then straight into the assessment. */
export function GoalCards() {
  return (
    <section className="goals section" aria-labelledby="goals-title">
      <div className="container">
        <Head />
        <ul className="goals__grid">
          {GOALS.map((g, i) => (
            <li key={g.slug} data-reveal style={{ '--delay': `${i * 90}ms`, '--goal': g.colour } as React.CSSProperties}>
              <Link href={`/start?goal=${g.slug}`} className="goal-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt="" width={1136} height={1408} loading="lazy" />
                <span className="goal-card__text">
                  <span className="goal-card__title">{g.title}</span>
                  <span className="goal-card__covers">{g.covers}</span>
                </span>
                <span className="goal-card__go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The men's "Start here": the same entry, on a dark colour field instead of a photo. */
export function MenGoalCards() {
  return (
    <section className="goals section" aria-labelledby="goals-title">
      <div className="container">
        <Head />
        <ul className="goals__grid goals__grid--three">
          {MEN_GOALS.map((g, i) => (
            <li key={g.slug} data-reveal style={{ '--delay': `${i * 90}ms`, '--goal': g.colour } as React.CSSProperties}>
              <Link href={`/start?goal=${g.slug}`} className="goal-card goal-card--pen">
                <span className="goal-card__text">
                  <span className="goal-card__title">{g.title}</span>
                  <span className="goal-card__covers">{g.covers}</span>
                </span>
                <span className="goal-card__go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
