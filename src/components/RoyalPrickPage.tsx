'use client';
import Link from 'next/link';
import { type CSSProperties, useEffect } from 'react';
import { PEN_BRANDS } from '@/brand/pens';
import { SOURCE_LINE } from '@/brand/source';
import { EditorialStatement } from './brand/Sections';
import { PenStage } from './brand/Pen';
import { ScrollFilm } from './brand/ScrollFilm';
import { BrandPage } from './site/BrandPage';

/**
 * The Royal Prick Experience, the concierge package: we do the heavy lifting.
 * It is an optional extra. Nobody needs it, or its blood test, to do an assessment and order a pen.
 * Kept out of search results and not tied to a checkout yet.
 */
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const TO_DO = [
  'Work out which peptide you even need',
  'Find a doctor who won’t raise an eyebrow',
  'Get a blood form',
  'Take a morning off work',
  'Sit in a lab queue',
  'Google your results at 11pm',
  'Work out if what you’re buying is real',
  'Phone around for stock',
  'Learn to inject from a stranger online',
  'Wonder who to call when something feels off',
  'Book your own follow-up bloods',
  'Do it all again in three months',
];

const STEPS = [
  { title: 'Tell us about you.', body: 'A private health screening on your phone. A clinician checks it makes sense to go further, then requests the right bloods for you.', job: 'Answer honestly', pen: 'slow-and-steady' },
  { title: 'A nurse comes to you.', body: 'Home, office, wherever suits. You choose the slot. One small prick before the good one.', job: 'Open the door', pen: 'the-glow-up' },
  { title: 'We get it tested.', body: 'Your sample goes straight to the lab. No forms to carry, no queue, no chasing anyone for anything.', job: 'Nothing', pen: 'all-day-energy' },
  { title: 'Your doctor calls.', body: 'A proper one-on-one online consultation. They go through your numbers in plain English and tell you what they would do.', job: 'Pick up', pen: 'deep-sleep-rebuild' },
  { title: 'Yes or no. Honestly.', body: 'If a pen is right for you, your doctor writes your script and we take it from there. If it isn’t, they tell you why. No yes, no pen.', job: 'Nothing', pen: 'sharp-mind' },
  { title: 'Your pen, at your door.', body: 'Sent cold, all the way. Then we show you your first dose, so you never have to figure it out alone.', job: 'Sign for it', pen: 'body-sculpt' },
  { title: 'We keep showing up.', body: 'Dose reminders, check-ins, a clinician to message, follow-up bloods back at your door and your next pen before you run out.', job: 'Reply when we check in', pen: 'skin-rewind' },
];

const STACK = [
  { what: 'Private health screening, read by a clinician', instead: 'Guessing whether this is safe for you' },
  { what: 'Nurse visit at your home or office', instead: 'A morning off and a lab queue' },
  { what: 'Blood panel chosen by your doctor', instead: 'A list of tests off the internet' },
  { what: 'Collection, lab and testing, all handled', instead: 'Carrying forms around and chasing results' },
  { what: 'One-on-one online consultation with your doctor', instead: 'A form, a tick and good luck' },
  { what: 'Your results in plain English, yours to keep', instead: 'Googling your own bloods' },
  { what: 'Your script, if a pen is right for you', instead: 'Hunting for someone to write one' },
  { what: 'Your pen, delivered in a full cold chain', instead: 'Phoning around for stock' },
  { what: 'Reminders, check-ins and a clinician to message', instead: 'Wondering who to call' },
  { what: 'Follow-up bloods, back at your door', instead: 'Starting the whole admin over' },
];

const BONUSES = [
  { name: 'The First Prick', body: 'Nervous about needles? Most people are. A nurse or a live video call talks you through your first dose, start to finish.', colour: 'var(--pink)' },
  { name: 'The Prick Kit', body: 'A travel case, needles, swabs and a sharps bin, so you never have to work out what to do with used needles. We take them away at your follow-up.', colour: 'var(--orange)' },
  { name: 'Your Person', body: 'One named human who handles your bookings and deliveries. Not a ticket number. Your health details stay with your clinician.', colour: 'var(--lime)' },
  { name: 'The Side-by-Side', body: 'Your first bloods next to your follow-up bloods, explained by your doctor. Numbers, not guesses.', colour: 'var(--sky)' },
];

const FOR_YOU = ['You’re curious about peptides and don’t know where to start', 'You want your bloods checked before anything goes in your body', 'You’re busy, and a lab queue isn’t happening', 'You’re a little scared of the needle', 'You want one team looking after all of it'];
const NOT_FOR_YOU = ['You want the cheapest pen in the country', 'You want a pen whatever the doctor says', 'You’d rather skip the bloods'];

const FAQ = [
  { q: 'Do I need this to get a pen?', a: 'No. This is the extra for people who want it all done for them. Anyone can do the online assessment and order a pen without it, and you don’t need a blood test to do that. Testosterone is the one exception, because your clinician needs your levels first. A clinician can also ask for a test if it matters for you.' },
  { q: 'Where do you come to?', a: 'Tell us where you are and we’ll let you know when a nurse can get to you.' },
  { q: 'What happens if the doctor says no?', a: 'You keep your bloods and you get a straight explanation of why, plus what your doctor would look at instead. No yes, no pen.' },
  { q: 'Why do I start with a screening?', a: 'Labs need a doctor’s request, and some people shouldn’t go further at all. A few minutes on your phone means nobody sends a nurse for nothing.' },
  { q: 'I had bloods done recently. Do I need new ones?', a: 'Maybe not. Tell us in your screening and your doctor will let you know if they’re recent and complete enough.' },
  { q: 'Who sees my results?', a: 'Your clinician and the people who need them to do your test. Not delivery, not support, not your employer.' },
];

const FINALE = ['the-glow-up', 'slow-and-steady', 'body-sculpt', 'all-day-energy', 'skin-rewind'];

/** The crowned pen from the film, standing on the royal carpet. */
function RoyalPrick() {
  return (
    <svg className="pkg-royal" viewBox="0 0 180 560" aria-hidden="true">
      <g stroke="#111" strokeWidth="6" strokeLinejoin="round">
        <path d="M34 72 L28 18 L62 44 L90 8 L118 44 L152 18 L146 72 Z" fill="#ffc62b" />
        <circle cx="90" cy="54" r="7" fill="var(--pink)" strokeWidth="4" />
        <rect x="30" y="72" width="120" height="50" rx="6" fill="#111" />
        <rect x="36" y="122" width="108" height="298" fill="#fff6ec" />
        <rect x="36" y="232" width="108" height="46" fill="var(--pink)" />
        <rect x="36" y="247" width="108" height="16" fill="#b9b9b9" strokeWidth="0" />
        <rect x="50" y="420" width="80" height="30" rx="4" fill="#111" />
      </g>
      <path d="M64 450 V540 M116 450 V540" stroke="#111" strokeWidth="13" />
      <path d="M50 553 H82 M98 553 H130" stroke="#111" strokeWidth="14" strokeLinecap="round" />
      <text transform="translate(90 349) rotate(-90)" fill="#111" textAnchor="middle" dominantBaseline="central" style={{ font: '400 62px var(--font-display)' }}>
        PRICK
      </text>
      <text transform="translate(90 177) rotate(-90)" fill="#111" textAnchor="middle" dominantBaseline="central" style={{ font: '700 10px var(--font-sans)', letterSpacing: '0.04em' }}>
        WE COME TO YOU
      </text>
    </svg>
  );
}

/** The 50-second film. It plays by itself when scrolled to. */
function Film() {
  // The homepage links straight here, so land on the film and let it start.
  useEffect(() => {
    if (window.location.hash === '#film') document.getElementById('film')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, []);
  return (
    <section id="film" className="pkg-film section" aria-labelledby="film-title">
      <div className="container">
        <h2 id="film-title" className="display pkg-h2" data-reveal>
          Fifty seconds. <span className="serif-i">No lab queue.</span>
        </h2>
        <div className="pkg-film__frame" data-reveal style={delay(120)}>
          <ScrollFilm
            className="pkg-film__video"
            src="/video/the-royal-prick-experience.mp4"
            poster="/video/the-royal-prick-experience.jpg"
            width={1920}
            height={1080}
            length="0:50"
            label="The Royal Prick Experience: a 50-second animated film, with captions"
          />
        </div>
      </div>
    </section>
  );
}

export function RoyalPrickPage() {
  return (
    <BrandPage doors={false}>
      <section className="pkg-hero">
        <div className="container pkg-hero__grid">
          <div>
            <p className="eyebrow">The Royal Prick Experience</p>
            <h1 className="display pkg-hero__title">
              Just open
              <br />
              the door.
              <span className="serif-i">We&apos;ll do the rest.</span>
            </h1>
            <p className="pkg-hero__lead">
              A nurse comes to you for your bloods. We get them tested. Your doctor reads them and talks you through them. If
              they say yes, your pen comes to you and we stay with you after that. You don&apos;t go anywhere.
            </p>
            <div className="pkg-actions">
              <Link href="/start" className="btn">Get the royal treatment</Link>
              <a href="#included" className="link-arrow">See what&apos;s in it</a>
            </div>
            <p className="pkg-hero__note">
              Purely optional. You don&apos;t need this package, or a blood test, to order a pen. Testosterone is the one exception.{' '}
              <Link href="/find-your-prick">Just here for a pen?</Link>
            </p>
          </div>
          <RoyalPrick />
        </div>
      </section>

      <Film />

      <section className="pkg-list section">
        <div className="container pkg-list__grid">
          <div data-reveal>
            <p className="eyebrow">Bloods and a doctor, the usual way</p>
            <h2 className="display pkg-h2">
              The full works
              <br />
              shouldn&apos;t be a
              <br />
              second job.
            </h2>
            <p className="serif-i pkg-list__note">So we took the whole list off yours.</p>
          </div>
          <ol className="pkg-todo" data-reveal style={delay(150)}>
            {TO_DO.map((t) => (
              <li key={t}><span>{t}</span></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pkg-journey section">
        <div className="container">
          <div className="pkg-journey__head" data-reveal>
            <p className="eyebrow">Door to door</p>
            <h2 className="display pkg-h2">
              Seven steps.
              <br />
              <span className="serif-i">Your job is mostly the door.</span>
            </h2>
          </div>
          <ol className="pkg-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="pkg-step" data-reveal style={{ ...delay((i % 3) * 90), '--step-colour': PEN_BRANDS[s.pen]?.colours.main } as CSSProperties}>
                <div className="pkg-step__num">0{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <p className="pkg-step__job"><span>Your job</span> {s.job}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="included" className="pkg-stack section">
        <div className="container narrow">
          <div data-reveal>
            <p className="eyebrow">What you get</p>
            <h2 className="display pkg-h2">Everything. <span className="serif-i">That&apos;s the point.</span></h2>
          </div>
          <div className="pkg-table" data-reveal style={delay(120)}>
            <div className="pkg-table__head"><span>The Royal Prick Experience</span><span>Instead of</span></div>
            {STACK.map((s) => (
              <div key={s.what} className="pkg-table__row">
                <strong>{s.what}</strong>
                <span>{s.instead}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div data-reveal>
            <p className="eyebrow">Also included</p>
            <h2 className="display pkg-h2">Because the small<br />stuff is the stuff.</h2>
          </div>
          <div className="pkg-bonuses">
            {BONUSES.map((b, i) => (
              <article key={b.name} className="pkg-bonus" data-reveal style={{ ...delay(i * 90), '--bonus': b.colour } as CSSProperties}>
                <h3 className="display">{b.name}</h3>
                <p>{b.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <EditorialStatement top="Most pricks make you do all the work." bottom="This one treats you like royalty.">
        <p>We do the heavy lifting. All of it.</p>
        <p className="small muted">{SOURCE_LINE}</p>
      </EditorialStatement>

      <section className="section">
        <div className="container pkg-fit">
          <div data-reveal>
            <h2 className="display pkg-h2">It&apos;s for you if</h2>
            <ul className="checklist">{FOR_YOU.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div data-reveal style={delay(120)}>
            <h2 className="display pkg-h2">It&apos;s not if</h2>
            <ul className="checklist pkg-fit__no">{NOT_FOR_YOU.map((t) => <li key={t}>{t}</li>)}</ul>
            <p>Rather skip the bloods? No problem. <Link href="/find-your-prick">Find your prick</Link> and do your assessment online, no package needed.</p>
            <p>Already on a prescribed protocol? <Link href="/start?route=repeat">Repeating your script</Link> is quicker.</p>
          </div>
        </div>
      </section>

      <section className="pkg-faq section">
        <div className="container narrow">
          <h2 className="display pkg-h2" data-reveal>Fair questions.</h2>
          <div data-reveal style={delay(100)}>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta section">
        <div className="container">
          <h2 className="display" data-reveal>
            Your only job
            <br />
            is the <span className="pop">door</span>.
          </h2>
          <div style={{ marginTop: 'var(--space-4)' }} data-reveal>
            <Link href="/start" className="btn light">Get the royal treatment</Link>
          </div>
          <div className="final-cta__pens" data-reveal>
            {FINALE.map((slug) => PEN_BRANDS[slug]).map((b, i) => (
              <PenStage key={b.slug} colours={b.colours} label={b.penLabel} botanical={b.botanical} angle={i % 2 ? -84 : -96} fit={0.95} />
            ))}
          </div>
          <p className="small pkg-small">Every treatment is a clinician&apos;s decision and not everyone will be suitable. How people respond varies.</p>
        </div>
      </section>
    </BrandPage>
  );
}
