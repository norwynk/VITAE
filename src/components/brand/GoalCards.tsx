import Link from 'next/link';
import { GOALS } from '@/brand/goals';
import { PEN_BRANDS } from '@/brand/pens';
import { MEN_GOALS } from '@/brand/sides';
import { PenStage } from './Pen';

/** "Start here": pick what you want first, then the quiz finds the pens. */
export function GoalCards() {
  return (
    <section className="goals section" aria-labelledby="goals-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">Start here</p>
            <h2 id="goals-title" className="display">
              What are
              <br />
              you after?
            </h2>
          </div>
          <p className="goals__lead">Pick one. A few quick questions, then we show you the pricks that fit.</p>
        </div>
        <ul className="goals__grid">
          {GOALS.map((g, i) => (
            <li key={g.slug} data-reveal style={{ '--delay': `${i * 90}ms`, '--goal': g.colour } as React.CSSProperties}>
              <Link href={`/find-your-prick?goal=${g.slug}`} className="goal-card">
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

/** The men's "Start here": the same three-step entry, with a pen on a dark colour field instead of a photo. */
export function MenGoalCards() {
  return (
    <section className="goals section" aria-labelledby="goals-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">Start here</p>
            <h2 id="goals-title" className="display">
              What are
              <br />
              you after?
            </h2>
          </div>
          <p className="goals__lead">Pick one. A few quick questions, then we show you the pricks that fit.</p>
        </div>
        <ul className="goals__grid goals__grid--three">
          {MEN_GOALS.map((g, i) => {
            const pen = PEN_BRANDS[g.pen];
            return (
              <li key={g.slug} data-reveal style={{ '--delay': `${i * 90}ms`, '--goal': g.colour } as React.CSSProperties}>
                <Link href={`/find-your-prick?goal=${g.slug}`} className="goal-card goal-card--pen">
                  <span className="goal-card__pen" aria-hidden="true">
                    <PenStage colours={pen.colours} label={pen.penLabel} botanical={pen.botanical} angle={-62} fit={0.92} />
                  </span>
                  <span className="goal-card__text">
                    <span className="goal-card__title">{g.title}</span>
                    <span className="goal-card__covers">{g.covers}</span>
                  </span>
                  <span className="goal-card__go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
