'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type Goal, GOALS, goalBySlug, goalForCategory } from '@/brand/goals';
import { penBrand } from '@/brand/pens';
import { publicDataMode } from '@/config';
import {
  type IntakeAnswers,
  type IntakeQuestion,
  type IntakeSection,
  type IntakeValue,
  ROUTE_NEW,
  ROUTE_REPEAT,
  isNewRoute,
  isRepeatRoute,
  problemWith,
  sectionsFor,
  visibleQuestions,
} from '@/domain/intake';
import { SA_PROVINCES, type Treatment, ageOn, localDate } from '@/domain/model';
import { type PenQuestion, type PenQuestionGroup, NONE_OF_THESE, groupsFor, invalidAnswer, isFlagged, splitMulti } from '@/domain/penQuestions';
import { type PenSafety, penSafety } from '@/domain/penSafety';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useScreening } from '@/hooks/useScreening';
import { MAX_SHORTLIST, useShortlist } from '@/hooks/useShortlist';
import { useSide } from '@/hooks/useSide';
import { forSide } from '@/brand/sides';
import { demoRepository } from '@/services/repository';
import { worldStyle } from '../brand/worldStyle';
import { ConsultCard } from '../brand/ConsultCard';
import { FitMoment } from '../member/FitMoment';
import { SiteNav } from '../site/SiteNav';
import { Notice } from '../ui';
import { Field } from './Fields';

/** Adults only: checked as soon as a date of birth is entered. */
export function underAge(dob: IntakeValue | undefined): boolean {
  return typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob) && ageOn(dob, localDate(new Date())) < 18;
}

/** Pens whose pen-specific answers have something for the clinician to look at. */
export function flaggedPens(penAnswers: Record<string, string>, pens: Treatment[]): Treatment[] {
  return pens.filter((p) => groupsFor([p]).some((g) => g.questions.some((q) => isFlagged(q, penAnswers[q.id] ?? ''))));
}

/** Whether anything in the answers should be pointed out to the clinician first. */
export function needsLook(answers: IntakeAnswers, penAnswers: Record<string, string>, pens: Treatment[]): boolean {
  return (
    flaggedPens(penAnswers, pens).length > 0 || answers.pregnant === 'Yes' || answers.pregnant === 'Not sure' || answers.breastfeeding === 'Yes'
  );
}

type Screen =
  | { kind: 'destination'; stop: number }
  | { kind: 'pens'; stop: number }
  | { kind: 'section'; stop: number; section: IntakeSection; questions: IntakeQuestion[]; part: number; parts: number }
  | { kind: 'safety'; stop: number; group: PenQuestionGroup; pen?: Treatment }
  | { kind: 'arrive'; stop: number }
  | { kind: 'fit'; stop: number };

/**
 * How much of a phone screen a question takes. A screen holds SCREEN_ROOM;
 * quick taps share, tables and rankings get a screen to themselves, and
 * optional "tell us more" boxes are folded (see OptionalLong), so they're light.
 */
const SCREEN_ROOM = 4;
function room(q: IntakeQuestion): number {
  if (q.id === 'vision' || q.kind === 'meds' || q.kind === 'rank') return SCREEN_ROOM;
  if (q.kind === 'long') return q.required ? 2 : 1;
  if (q.kind === 'multi' || q.kind === 'tags' || q.kind === 'date') return 2;
  return 1;
}
function chunk(questions: IntakeQuestion[]): IntakeQuestion[][] {
  const out: IntakeQuestion[][] = [];
  let buf: IntakeQuestion[] = [];
  let used = 0;
  const flush = () => {
    if (buf.length) out.push(buf);
    buf = [];
    used = 0;
  };
  for (const q of questions) {
    const w = room(q);
    if (used + w > SCREEN_ROOM) flush();
    buf.push(q);
    used += w;
    if (used >= SCREEN_ROOM) flush();
  }
  flush();
  return out;
}

/** The route: why, pens, who you are, your health, safety for your pens, the rest of your life. */
function buildRoute(
  sections: IntakeSection[],
  answers: IntakeAnswers,
  groups: PenQuestionGroup[],
  chosen: Treatment[],
  askDestination: boolean,
  askRoute: boolean,
) {
  const stops: string[] = [];
  // Only asked when nothing upstream (home goal cards, the quiz, a pen page) already told us.
  const screens: Screen[] = [];
  const addSection = (s: IntakeSection) => {
    // The way in already said new or repeat: don't ask again.
    if (s.id === 'start' && !askRoute) return;
    // The opening question (new, or repeating a script) comes before the route itself.
    const stop = s.id === 'start' ? -1 : stops.push(s.label) - 1;
    // Chunk every question, then hide the ones that don't apply, so a follow-up appearing never moves another question.
    const visible = new Set(visibleQuestions(s, answers));
    const parts = chunk(s.questions)
      .map((c) => c.filter((q) => visible.has(q)))
      .filter((c) => c.length);
    parts.forEach((questions, part) => screens.push({ kind: 'section', stop, section: s, questions, part, parts: parts.length }));
  };
  let pensAdded = false;
  for (const s of sections) {
    addSection(s);
    // New to peptides: where they're heading, unless we already know.
    if (s.id === 'start' && askDestination && isNewRoute(answers)) screens.push({ kind: 'destination', stop: -1 });
    if ((s.id === 'why' || s.id === 'script') && !pensAdded) {
      pensAdded = true;
      screens.push({ kind: 'pens', stop: stops.push('Your pens') - 1 });
    }
    if (s.id === 'history' && groups.length) {
      const stop = stops.push('Safety check') - 1;
      for (const g of groups) screens.push({ kind: 'safety', stop, group: g, pen: chosen.find((p) => g.slugs?.includes(p.slug)) });
    }
  }
  screens.push({ kind: 'arrive', stop: stops.length }, { kind: 'fit', stop: stops.length });
  return { stops, screens };
}

/** "Why this matters" copy, with their destination dropped in. */
function because(text: string | undefined, goal: Goal | undefined) {
  return text?.replace('{goal}', goal?.destination ?? 'your goal');
}

/**
 * The health questionnaire as a journey, before any account. It starts with
 * where they're heading and keeps that destination in view; every stop says
 * why it matters. Saved on this device as they go. At the end: a short
 * "arriving" moment, the good-fit result, then an account to send it.
 */
export function Questionnaire({
  initialPen,
  initialGoal,
  initialRoute,
  initialPens,
}: {
  initialPen?: string;
  initialGoal?: string;
  initialRoute?: string;
  initialPens?: Treatment[];
}) {
  const { pens } = useCatalogue(initialPens);
  const shortlist = useShortlist();
  const { state, update, clear } = useScreening();
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { add } = shortlist;
  useEffect(() => {
    if (initialPen) add(initialPen);
  }, [initialPen, add]);
  // The way in decides the route: "Repeat your script" means a script; Find yours, a pen or a goal means new.
  // It replaces an answer left on this device by an earlier visit, and starts the route again if it changed.
  const entryRoute = initialRoute === 'repeat' ? ROUTE_REPEAT : initialPen || initialGoal ? ROUTE_NEW : undefined;
  useEffect(() => {
    if (entryRoute) update((s) => (s.answers.route === entryRoute ? {} : { answers: { ...s.answers, route: entryRoute }, step: 0, completedAt: undefined }));
  }, [entryRoute, update]);

  // The men's side only offers the men's range.
  const { side } = useSide();
  const available = forSide((pens ?? []).map((p) => p.treatment), side, (t) => t.slug);
  const chosen = shortlist.slugs.map((s) => available.find((t) => t.slug === s)).filter((t): t is Treatment => Boolean(t));
  // Where they're heading is already known if they came with a goal or with pens: never ask twice.
  const known =
    goalBySlug(initialGoal) ??
    goalForCategory(available.find((t) => t.slug === initialPen)?.category) ??
    goalForCategory(chosen[0]?.category);
  const destination = state.destination ?? known?.slug;
  const goal = goalBySlug(destination);
  useEffect(() => {
    if (state.destination || !known) return;
    update((s) => ({
      destination: known.slug,
      destinationFrom: 'known',
      answers: Array.isArray(s.answers.goals) && s.answers.goals.length ? s.answers : { ...s.answers, goals: known.intakeGoals },
    }));
  }, [state.destination, known, update]);
  const firstName = typeof state.answers.firstName === 'string' ? state.answers.firstName : '';

  const sections = sectionsFor(state.answers);
  const groups = groupsFor(chosen);
  const { stops, screens } = buildRoute(
    sections,
    state.answers,
    groups,
    chosen,
    // Once asked here it stays on the route, so picking pens later never shifts the steps.
    state.destinationFrom === 'asked' || (state.destinationFrom !== 'known' && !known),
    !entryRoute,
  );
  const step = Math.min(state.step, screens.length - 1);
  const screen = screens[step];
  // Endowed progress: the route starts a little way along.
  const progress = Math.round(8 + (92 * step) / (screens.length - 1));

  const setAnswer = (id: string, v: IntakeValue | undefined) =>
    update((s) => {
      const answers = { ...s.answers };
      if (v === undefined) delete answers[id];
      else answers[id] = v;
      return { answers, completedAt: undefined };
    });
  const setPen = (id: string, v: string) => update((s) => ({ penAnswers: { ...s.penAnswers, [id]: v }, completedAt: undefined }));

  const go = (n: number) => {
    setProblem(null);
    update({ step: n, ...(screens[n]?.kind === 'fit' ? { completedAt: new Date().toISOString() } : {}) });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const check = (): string | null => {
    switch (screen.kind) {
      case 'destination':
        return destination ? null : 'Choose where you’re heading. You can change it later.';
      case 'pens':
        return chosen.length || state.letClinicianSuggest ? null : 'Choose at least one pen, or let your clinician suggest one.';
      case 'section': {
        for (const q of screen.questions) {
          const p = problemWith(onScreen(q), state.answers[q.id], SA_PROVINCES);
          if (p) return p;
          if (q.id === 'dateOfBirth' && underAge(state.answers.dateOfBirth)) return 'PRICK is only for adults aged 18 and over.';
        }
        return null;
      }
      case 'safety':
        for (const q of screen.group.questions) {
          const p = invalidAnswer(q, state.penAnswers[q.id] ?? '');
          if (p) return p;
        }
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const p = check();
    if (p) {
      setProblem(p);
      return;
    }
    go(step + 1);
  };
  // Single-tap screens move on by themselves; the ref always sees the latest answers.
  const nextRef = useRef(next);
  const stepRef = useRef(step);
  useEffect(() => {
    nextRef.current = next;
    stepRef.current = step;
  });
  // Only if they're still on the screen they tapped: a quick "Next" click must not skip one.
  const autoAdvance = (v: unknown) => {
    const from = step;
    if (v) window.setTimeout(() => stepRef.current === from && nextRef.current(), 380);
  };

  const chooseDestination = (slug: string) => {
    const g = goalBySlug(slug);
    update((s) => {
      const goals = Array.isArray(s.answers.goals) && s.answers.goals.length ? s.answers.goals : g?.intakeGoals;
      return { destination: slug, destinationFrom: 'asked', answers: goals ? { ...s.answers, goals } : s.answers };
    });
    autoAdvance(slug);
  };

  const createAccount = async () => {
    setBusy(true);
    try {
      if (publicDataMode() === 'demo') {
        await demoRepository.startSession('MEMBER', 'signup');
        router.push('/app');
      } else router.push('/app?signup=1');
    } catch (e) {
      setProblem((e as Error).message);
      setBusy(false);
    }
  };

  const accent = chosen[0] ? worldStyle(penBrand(chosen[0]).colours) : ({ '--accent': goal?.colour ?? 'var(--pink)' } as React.CSSProperties);
  const stopIndex = screen.stop;
  const firstOfStop = screens.findIndex((s) => s.stop === stopIndex) === step;
  const cheer =
    screen.kind === 'section' && screen.part === 0 && firstOfStop
      ? stopIndex === Math.floor(stops.length / 2)
        ? `Halfway there${firstName ? `, ${firstName}` : ''}. The hardest part is behind you.`
        : stopIndex === stops.length - 1
          ? 'Last stop. Nearly there.'
          : null
      : null;

  return (
    <>
      <SiteNav cta={false} />
      <main className="intake" style={accent}>
        <div className="container narrow" ref={topRef}>
          <Route stops={stops} current={stopIndex} progress={progress} goal={goal} />

          <section className="intake__screen" key={step}>
            {screen.kind === 'destination' && (
              <Destination chosen={destination} onChoose={chooseDestination} goals={GOALS.filter((g) => available.some((t) => t.category === g.category))} men={side === 'men'} />
            )}

            {screen.kind === 'section' && (
              <>
                {cheer && <p className="intake__cheer">{cheer}</p>}
                {screen.part === 0 ? (
                  <StopHead eyebrow={screen.section.label} title={screen.section.title} lead={screen.section.lead} why={because(screen.section.why, goal)} />
                ) : (
                  <p className="eyebrow">
                    {screen.section.label} · {screen.part + 1} of {screen.parts}
                  </p>
                )}
                {screen.section.id === 'why' && screen.part === 0 && goal && <PictureIt goal={goal} />}
                <div className="intake__fields">
                  {screen.questions.map((q) => (
                    <Field
                      key={q.id}
                      q={q.id === 'vision' && goal ? { ...q, placeholder: `For example: “${goal.visionExample}”` } : onScreen(q)}
                      value={state.answers[q.id]}
                      onChange={(v) => {
                        setAnswer(q.id, v);
                        if (screen.questions.length === 1 && q.kind === 'choice') autoAdvance(v);
                      }}
                      options={q.id === 'province' ? SA_PROVINCES : undefined}
                    />
                  ))}
                </div>
              </>
            )}

            {screen.kind === 'pens' && (
              <PensStep
                repeat={isRepeatRoute(state.answers)}
                chosen={chosen}
                available={available}
                goal={goal}
                shortlist={shortlist}
                letClinicianSuggest={state.letClinicianSuggest}
                onLet={(v) => update({ letClinicianSuggest: v })}
              />
            )}

            {screen.kind === 'safety' && (
              <>
                <StopHead
                  eyebrow="Safety check"
                  title={screen.pen ? `${screen.pen.name}: the safety check.` : screen.group.title}
                  why={
                    screen.pen
                      ? `Every pen on the way to ${goal?.destination ?? 'your goal'} has its own safety rules. These are ${screen.pen.name}’s. They’re required, and your clinician reads every answer.`
                      : 'Questions just for the pens you picked, so your clinician can plan around you.'
                  }
                />
                {screen.pen && penSafety(screen.pen.slug) && <GoodToKnow name={screen.pen.name} safety={penSafety(screen.pen.slug)!} />}
                <div className="intake__pen-qs">
                  {screen.group.questions.map((q) => (
                    <PenField key={q.id} q={q} value={state.penAnswers[q.id] ?? ''} onChange={(v) => setPen(q.id, v)} />
                  ))}
                </div>
              </>
            )}

            {screen.kind === 'arrive' && <Arriving pens={chosen} goal={goal} repeat={isRepeatRoute(state.answers)} onDone={() => go(step + 1)} />}

            {screen.kind === 'fit' && (
              <>
                <FitMoment
                  pens={chosen}
                  goal={goal}
                  firstName={firstName}
                  vision={typeof state.answers.vision === 'string' ? state.answers.vision : ''}
                  flagged={flaggedPens(state.penAnswers, chosen)}
                  needsLook={needsLook(state.answers, state.penAnswers, chosen)}
                  tooYoung={underAge(state.answers.dateOfBirth)}
                  repeat={isRepeatRoute(state.answers)}
                />
                <div className="intake__account">
                  <h2 className="display">Save your journey.</h2>
                  <p>
                    Make an account so your answers reach your clinician and nothing gets lost. Then one last quick stop: your surname,
                    ID number and consent.
                  </p>
                  <div className="row">
                    <button type="button" onClick={createAccount} disabled={busy || underAge(state.answers.dateOfBirth)}>
                      Create my account
                    </button>
                    <Link href="/app" className="link-arrow">
                      I already have an account
                    </Link>
                  </div>
                </div>
              </>
            )}
          </section>

          {problem && <Notice tone="error">{problem}</Notice>}
          {screen.kind !== 'arrive' && (
            <div className="intake__nav">
              {step > 0 && (
                <button type="button" className="secondary" onClick={() => go(screen.kind === 'fit' ? step - 2 : step - 1)}>
                  Back
                </button>
              )}
              {screen.kind !== 'fit' && screen.kind !== 'destination' && (
                <button type="button" onClick={next} disabled={!pens}>
                  {screens[step + 1]?.kind === 'arrive' ? 'See where I stand' : 'Next'}
                </button>
              )}
              {(step > 0 || Object.keys(state.answers).length > 0) && (
                <button
                  type="button"
                  className="link-arrow intake__clear"
                  onClick={() => {
                    if (window.confirm('Start over? This clears your answers and the pens you picked from this device.')) {
                      clear();
                      shortlist.clear();
                      setProblem(null);
                      // A clean start: forget the way they came in too, so the opening question is asked.
                      router.replace('/start');
                    }
                  }}
                >
                  Clear my answers
                </button>
              )}
            </div>
          )}
          <p className="muted small intake__privacy">Private. Only your clinician sees your answers. Saved on this device as you go, and sent only when you finish.</p>
        </div>
      </main>
    </>
  );
}

/** Where they are on the way, with the destination always in view. */
function Route({ stops, current, progress, goal }: { stops: string[]; current: number; progress: number; goal?: Goal }) {
  return (
    <div className="route" aria-label="Your progress">
      <div className="route__bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="route__meta">
        <span className="small">
          {current < 0 ? 'Getting started' : current >= stops.length ? 'Arriving' : `Stop ${current + 1} of ${stops.length} · ${stops[current]}`}
        </span>
        {goal && <span className="route__flag">Heading for: {goal.title}</span>}
      </div>
    </div>
  );
}

function StopHead({ eyebrow, title, lead, why }: { eyebrow: string; title: string; lead?: string; why?: string }) {
  return (
    <div className="stop-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display intake__title">{title}</h1>
      {lead && <p className="intake__lead">{lead}</p>}
      {why && (
        <p className="stop-head__why">
          <strong>Why this matters:</strong> {why}
        </p>
      )}
    </div>
  );
}

/** First stop: where they want to end up. One tap, and it colours everything after it. */
/** The goals this side has pens for; the men's side shows colour instead of the photos. */
function Destination({ chosen, onChoose, goals, men }: { chosen?: string; onChoose: (slug: string) => void; goals: Goal[]; men: boolean }) {
  return (
    <>
      <div className="stop-head">
        <p className="eyebrow">Your screening starts here</p>
        <h1 className="display intake__title">
          Where are you heading?
          <span className="serif-i">Pick the one that matters most right now.</span>
        </h1>
      </div>
      <div className="destinations" role="radiogroup" aria-label="Where are you heading?">
        {goals.map((g) => (
          <button
            key={g.slug}
            type="button"
            role="radio"
            aria-checked={chosen === g.slug}
            className="destination"
            style={{ '--goal': g.colour, backgroundImage: men ? undefined : `url(${g.image})` } as React.CSSProperties}
            onClick={() => onChoose(g.slug)}
          >
            <span className="destination__title">{g.title}</span>
            <span className="destination__covers">{g.covers}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link-arrow intake__unsure" aria-pressed={chosen === 'unsure'} onClick={() => onChoose('unsure')}>
        Not sure yet. Show me everything.
      </button>
    </>
  );
}

function PictureIt({ goal }: { goal: Goal }) {
  return (
    <figure className="picture-it" style={{ '--goal': goal.colour, backgroundImage: `url(${goal.image})` } as React.CSSProperties}>
      <figcaption>{goal.picture}</figcaption>
    </figure>
  );
}

function GoodToKnow({ name, safety }: { name: string; safety: PenSafety }) {
  return (
    <aside className="good-to-know" aria-label={`Good to know about ${name}`}>
      <p className="eyebrow">Good to know</p>
      <p>
        <strong>What’s in it:</strong> {safety.contains}
      </p>
      <div>
        <strong>{name} is not for you if:</strong>
        <ul>
          {safety.notFor.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <details>
        <summary>Things your clinician needs to know about ({safety.tellUs.length})</summary>
        <ul>
          {safety.tellUs.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
      <p>
        <strong>What a course looks like:</strong> {safety.course} Your clinician sets your dose.
      </p>
    </aside>
  );
}

/** A short, honest "working on it" moment: each line is a check that really runs. */
function Arriving({ pens, goal, repeat, onDone }: { pens: Treatment[]; goal?: Goal; repeat: boolean; onDone: () => void }) {
  const lines = [
    'Reading your answers',
    ...(repeat ? ['Checking your script details'] : []),
    ...pens.map((p) => `Running the ${p.name} safety check`),
    ...(repeat ? [] : [`Mapping your route to ${goal?.destination ?? 'your goal'}`]),
    'Getting your file ready for your clinician',
  ];
  const [done, setDone] = useState(0);
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  });
  useEffect(() => {
    if (done >= lines.length) {
      const t = window.setTimeout(() => finish.current(), 500);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setDone((n) => n + 1), 650);
    return () => window.clearTimeout(t);
  }, [done, lines.length]);
  return (
    <div className="arriving" aria-live="polite">
      <p className="eyebrow">Arriving</p>
      <h1 className="display intake__title">Putting it all together.</h1>
      <ul className="plain arriving__list">
        {lines.map((l, i) => (
          <li key={l} className={i < done ? 'is-done' : i === done ? 'is-now' : ''}>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Pens they already picked are confirmed, not sold to: no "add more". Only
 * someone who arrives with none is shown the pens for their goal.
 */
function PensStep({ repeat, ...props }: Parameters<typeof PensPicker>[0] & { repeat: boolean }) {
  const { chosen, shortlist, goal } = props;
  // Decided when the step opens, so removing a pen doesn't turn this into a shop.
  const [arrivedWithPens] = useState(shortlist.slugs.length > 0);
  if (arrivedWithPens && shortlist.slugs.length > 0) {
    return (
      <>
        <StopHead
          eyebrow="Your pens"
          title={chosen.length === 1 ? 'The pen you’re bringing.' : 'The pens you’re bringing.'}
          lead="Your clinician reviews each one and decides what’s right for you."
          why="Each pen comes with its own safety check later on, so you only answer the questions that matter to you."
        />
        <ul className="plain screening__pens">
          {chosen.map((t) => {
            const b = penBrand(t);
            return (
              <li key={t.id} className="screening__pen" style={worldStyle(b.colours)}>
                <span className="screening__pen-dot" />
                <span className="screening__pen-name">{t.name}</span>
                <span className="screening__pen-hook">
                  {b.hook}
                  {penSafety(t.slug) && <span className="pen-pick__safety"> · Includes a safety check</span>}
                </span>
                <button type="button" className="secondary small" onClick={() => shortlist.remove(t.slug)} aria-label={`Remove ${t.name}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <p className="small muted" style={{ margin: 0 }}>
          Changed your mind about one? Remove it here.
        </p>
      </>
    );
  }
  return (
    <>
      <StopHead
        eyebrow="Your pens"
        title={repeat ? 'Which pens are on your script?' : 'Which pen brings you here?'}
        lead={repeat ? 'Pick the pens that match your current protocol.' : 'Pick the one you’d like your clinician to consider. Not sure? Let them suggest.'}
        why={goal ? `These are the pens made for ${goal.destination}. Each one comes with its own safety check later on.` : undefined}
      />
      <PensPicker {...props} allowSuggest={!repeat} />
    </>
  );
}

function PensPicker({
  chosen,
  available,
  goal,
  shortlist,
  letClinicianSuggest,
  onLet,
  allowSuggest = true,
}: {
  allowSuggest?: boolean;
  chosen: Treatment[];
  available: Treatment[];
  goal?: Goal;
  shortlist: ReturnType<typeof useShortlist>;
  letClinicianSuggest: boolean;
  onLet: (v: boolean) => void;
}) {
  const open = available.filter((t) => t.active && t.public);
  const forGoal = goal ? open.filter((t) => t.category === goal.category) : open;
  const others = goal ? open.filter((t) => t.category !== goal.category) : [];
  const card = (t: Treatment) => {
    const b = penBrand(t);
    const on = shortlist.has(t.slug);
    return (
      <button
        key={t.id}
        type="button"
        aria-pressed={on}
        className="pen-pick"
        style={worldStyle(b.colours)}
        disabled={!on && shortlist.full}
        onClick={() => {
          if (on) shortlist.remove(t.slug);
          else {
            shortlist.add(t.slug);
            onLet(false);
          }
        }}
      >
        <span className="screening__pen-dot" />
        <span className="pen-pick__name">
          {t.name}
          {b.forHim && <span className="pen-pick__tag">For him</span>}
        </span>
        <span className="pen-pick__hook">{b.hook}</span>
        {penSafety(t.slug) && <span className="pen-pick__safety">Includes a safety check</span>}
        <span className="pen-pick__tick" aria-hidden="true">
          {on ? '✓' : '+'}
        </span>
      </button>
    );
  };
  return (
    <div className="stack">
      <div className="pen-picks">{forGoal.map(card)}</div>
      {goal?.slug === 'weight' && <ConsultCard variant="inline" />}
      {others.length > 0 && (
        <details className="pen-picks__more" open={chosen.some((t) => t.category !== goal?.category)}>
          <summary>More pens</summary>
          <div className="pen-picks">{others.map(card)}</div>
        </details>
      )}
      {shortlist.full && <p className="small muted">Your clinician reviews up to {MAX_SHORTLIST} at a time.</p>}
      {!chosen.length && allowSuggest && (
        <label className="check">
          <input type="checkbox" checked={letClinicianSuggest} onChange={(e) => onLet(e.target.checked)} /> Not sure yet. Let my clinician
          suggest something.
        </label>
      )}
      <p className="small" style={{ margin: 0 }}>
        Not sure which? <Link href="/find-your-prick">Take the quiz</Link> and come back.
      </p>
    </div>
  );
}

function PenField({ q, value, onChange }: { q: PenQuestion; value: string; onChange: (v: string) => void }) {
  const head = (
    <>
      <span className="qf__label">
        {q.question}
        {!q.required && <span className="qf__opt"> (optional)</span>}
      </span>
      {q.hint && <span className="qf__hint">{q.hint}</span>}
    </>
  );
  if (q.kind === 'yesNo' || q.kind === 'choice' || q.kind === 'multi') {
    const picked = q.kind === 'multi' ? splitMulti(value) : [value];
    return (
      <div className="qf qf--chips" data-q={`pen:${q.id}`}>
        {head}
        <div className="qf__chips">
          {q.options!.map((o) => {
            const on = picked.includes(o);
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                className="qf__chip"
                onClick={() => {
                  if (q.kind !== 'multi') return onChange(on ? '' : o);
                  // "None of these" stands alone.
                  const next = on ? picked.filter((x) => x !== o) : o === NONE_OF_THESE ? [o] : [...picked.filter((x) => x !== NONE_OF_THESE), o];
                  onChange((q.options ?? []).filter((x) => next.includes(x)).join(', '));
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <label className="qf" data-q={`pen:${q.id}`}>
      {head}
      <input type={q.kind === 'number' ? 'number' : 'text'} min={q.min} max={q.max} step="any" maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/**
 * The opening fork is optional on the server (older screenings never had it),
 * but on screen an answer is needed to choose the route.
 */
function onScreen(q: IntakeQuestion): IntakeQuestion {
  return q.id === 'route' ? { ...q, required: true } : q;
}
