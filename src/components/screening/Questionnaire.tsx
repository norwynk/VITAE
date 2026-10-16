'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { penBrand } from '@/brand/pens';
import { publicDataMode } from '@/config';
import { type IntakeAnswers, type IntakeValue, problemWith, sectionsFor, visibleQuestions } from '@/domain/intake';
import { SA_PROVINCES, type Treatment, ageOn, localDate } from '@/domain/model';
import { type PenQuestion, groupsFor, invalidAnswer, isFlagged } from '@/domain/penQuestions';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useScreening } from '@/hooks/useScreening';
import { MAX_SHORTLIST, useShortlist } from '@/hooks/useShortlist';
import { demoRepository } from '@/services/repository';
import { worldStyle } from '../brand/worldStyle';
import { FitMoment } from '../member/FitMoment';
import { SiteNav } from '../site/SiteNav';
import { Notice } from '../ui';
import { Field } from './Fields';

/** Adults only: checked as soon as a date of birth is entered. */
export function underAge(dob: IntakeValue | undefined): boolean {
  return typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob) && ageOn(dob, localDate(new Date())) < 18;
}

/** Whether anything in the answers should be pointed out to the clinician first. */
export function needsLook(answers: IntakeAnswers, penAnswers: Record<string, string>, pens: Treatment[]): boolean {
  const flaggedPen = groupsFor(pens).some((g) => g.questions.some((q) => isFlagged(q, penAnswers[q.id] ?? '')));
  return flaggedPen || answers.pregnant === 'Yes' || answers.pregnant === 'Not sure' || answers.breastfeeding === 'Yes';
}

/**
 * The health questionnaire, before any account. One topic per screen, saved
 * on this device as they go. At the end: the "good fit" moment, then create
 * an account to send it to a clinician.
 */
export function Questionnaire({ initialPen }: { initialPen?: string }) {
  const { pens } = useCatalogue();
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

  const available = (pens ?? []).map((p) => p.treatment);
  const chosen = shortlist.slugs.map((s) => available.find((t) => t.slug === s)).filter((t): t is Treatment => Boolean(t));
  const sections = sectionsFor(state.answers);
  const screens = ['pens', ...sections.map((s) => s.id), 'fit'];
  const step = Math.min(state.step, screens.length - 1);
  const screen = screens[step];
  const penGroups = groupsFor(chosen);
  const progress = Math.round(((step + 1) / screens.length) * 100);

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
    update({ step: n, ...(screens[n] === 'fit' ? { completedAt: new Date().toISOString() } : {}) });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const check = (): string | null => {
    if (screen === 'pens') return chosen.length || state.letClinicianSuggest ? null : 'Choose at least one pen, or let your clinician suggest one.';
    const section = sections.find((s) => s.id === screen);
    if (!section) return null;
    for (const q of visibleQuestions(section, state.answers)) {
      const p = problemWith(q, state.answers[q.id], SA_PROVINCES);
      if (p) return p;
    }
    if (screen === 'about' && underAge(state.answers.dateOfBirth)) return 'PRICK is only for adults aged 18 and over.';
    if (screen === 'history') {
      for (const g of penGroups) for (const q of g.questions) {
        const p = invalidAnswer(q, state.penAnswers[q.id] ?? '');
        if (p) return p;
      }
    }
    return null;
  };

  const next = () => {
    const p = check();
    if (p) {
      setProblem(p);
      return;
    }
    go(step + 1);
  };

  const createAccount = async () => {
    setBusy(true);
    try {
      if (publicDataMode() === 'demo') await demoRepository.startSession('MEMBER', 'signup');
      router.push('/app');
    } catch (e) {
      setProblem((e as Error).message);
      setBusy(false);
    }
  };

  const first = chosen[0] ? penBrand(chosen[0]) : null;

  return (
    <>
      <SiteNav cta={false} />
      <main className="intake" style={first ? worldStyle(first.colours) : ({ '--accent': 'var(--pink)' } as React.CSSProperties)}>
        <div className="container narrow" ref={topRef}>
          <div className="intake__top">
            <p className="eyebrow">
              Health screening · {step + 1} of {screens.length}
            </p>
            <div className="quiz__progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Private. Only your clinician sees your answers. Saved on this device as you go.
            </p>
          </div>

          {screen === 'pens' && (
            <section className="intake__screen" key="pens">
              <h1 className="display intake__title">
                The fun part is picking it.
                <span className="serif-i">The important part is making sure it&apos;s right for you.</span>
              </h1>
              <PensPicker chosen={chosen} available={available} shortlist={shortlist} letClinicianSuggest={state.letClinicianSuggest} onLet={(v) => update({ letClinicianSuggest: v })} />
            </section>
          )}

          {sections.map(
            (s) =>
              s.id === screen && (
                <section className="intake__screen" key={s.id}>
                  <p className="eyebrow">{s.label}</p>
                  <h1 className="display intake__title">{s.title}</h1>
                  {s.lead && <p className="intake__lead">{s.lead}</p>}
                  <div className="intake__fields">
                    {s.id === 'history' && penGroups.length > 0 && <PenFields groups={penGroups} values={state.penAnswers} onChange={setPen} />}
                    {visibleQuestions(s, state.answers).map((q) => (
                      <Field key={q.id} q={q} value={state.answers[q.id]} onChange={(v) => setAnswer(q.id, v)} options={q.id === 'province' ? SA_PROVINCES : undefined} />
                    ))}
                  </div>
                </section>
              ),
          )}

          {screen === 'fit' && (
            <section className="intake__screen" key="fit">
              <FitMoment pens={chosen} needsLook={needsLook(state.answers, state.penAnswers, chosen)} tooYoung={underAge(state.answers.dateOfBirth)} />
              <div className="intake__account">
                <h2 className="display">Now, make it official.</h2>
                <p>
                  Create your account to send your answers to a clinician. Then it&apos;s one last quick step: your surname, ID
                  number and consent.
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
            </section>
          )}

          {problem && <Notice tone="error">{problem}</Notice>}
          <div className="intake__nav">
            {step > 0 && (
              <button type="button" className="secondary" onClick={() => go(step - 1)}>
                Back
              </button>
            )}
            {screen !== 'fit' && (
              <button type="button" onClick={next} disabled={!pens}>
                {screens[step + 1] === 'fit' ? 'See where I stand' : 'Next'}
              </button>
            )}
            {(step > 0 || Object.keys(state.answers).length > 0) && (
              <button
                type="button"
                className="link-arrow intake__clear"
                onClick={() => {
                  if (window.confirm('Clear all your answers from this device?')) {
                    clear();
                    setProblem(null);
                  }
                }}
              >
                Clear my answers
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function PensPicker({
  chosen,
  available,
  shortlist,
  letClinicianSuggest,
  onLet,
}: {
  chosen: Treatment[];
  available: Treatment[];
  shortlist: ReturnType<typeof useShortlist>;
  letClinicianSuggest: boolean;
  onLet: (v: boolean) => void;
}) {
  const addable = available.filter((t) => t.active && t.public && !shortlist.has(t.slug));
  return (
    <div className="stack">
      <p className="intake__lead">Choose up to {MAX_SHORTLIST}. Each one goes to your clinician, who decides what is right for you.</p>
      {chosen.length > 0 && (
        <ul className="plain screening__pens">
          {chosen.map((t) => {
            const b = penBrand(t);
            return (
              <li key={t.id} className="screening__pen" style={worldStyle(b.colours)}>
                <span className="screening__pen-dot" />
                <span className="screening__pen-name">{t.name}</span>
                <span className="screening__pen-hook">{b.hook}</span>
                <button type="button" className="secondary small" onClick={() => shortlist.remove(t.slug)} aria-label={`Remove ${t.name}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!shortlist.full && addable.length > 0 && (
        <label>
          {chosen.length ? 'Add another pen' : 'Choose a pen'}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) shortlist.add(e.target.value);
              onLet(false);
            }}
          >
            <option value="">Choose…</option>
            {addable.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!chosen.length && (
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

function PenFields({ groups, values, onChange }: { groups: ReturnType<typeof groupsFor>; values: Record<string, string>; onChange: (id: string, v: string) => void }) {
  return (
    <div className="intake__pen-qs">
      {groups.map((g) => (
        <fieldset key={g.id} className="qf qf--group">
          <legend>{g.title}</legend>
          {g.questions.map((q) => (
            <PenField key={q.id} q={q} value={values[q.id] ?? ''} onChange={(v) => onChange(q.id, v)} />
          ))}
        </fieldset>
      ))}
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
    const picked = q.kind === 'multi' ? value.split(', ').filter(Boolean) : [value];
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
                  const next = on ? picked.filter((x) => x !== o) : [...picked, o];
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
