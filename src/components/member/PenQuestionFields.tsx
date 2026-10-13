'use client';
import type { PenQuestion, PenQuestionGroup } from '@/domain/penQuestions';

/** Form field name for a question; `multi` options add `:<index>`. */
export const penField = (id: string) => `pen:${id}`;

/**
 * Reads the answers for these groups from the form. `multi` answers are joined
 * with ", " in option order; unanswered optional questions come back as "".
 */
export function readPenAnswers(form: HTMLFormElement, groups: PenQuestionGroup[]): { questionId: string; answer: string }[] {
  const data = new FormData(form);
  return groups.flatMap((g) =>
    g.questions.map((q) => {
      if (q.kind === 'multi') {
        const picked = (q.options ?? []).filter((_, i) => data.get(`${penField(q.id)}:${i}`) === 'on');
        return { questionId: q.id, answer: picked.join(', ') };
      }
      const v = data.get(penField(q.id));
      return { questionId: q.id, answer: typeof v === 'string' ? v.trim() : '' };
    }),
  );
}

/** Pen-specific questions, grouped. Uncontrolled: restored from the saved draft through defaults. */
export function PenQuestionFields({
  groups,
  text,
  ticked,
}: {
  groups: PenQuestionGroup[];
  text: (name: string) => string | undefined;
  ticked: (name: string) => boolean;
}) {
  if (!groups.length) return null;
  return (
    <fieldset className="pen-questions">
      <legend>About your pens</legend>
      <p className="muted small" style={{ margin: 0 }}>
        A few questions that matter for the pens you picked. Only your clinician sees your answers.
      </p>
      {groups.map((g) => (
        <div key={g.id} className="pen-questions__group">
          <h3>{g.title}</h3>
          {g.questions.map((q) => (
            <Question key={q.id} q={q} text={text} ticked={ticked} />
          ))}
        </div>
      ))}
    </fieldset>
  );
}

function Question({ q, text, ticked }: { q: PenQuestion; text: (name: string) => string | undefined; ticked: (name: string) => boolean }) {
  const name = penField(q.id);
  const label = (
    <>
      {q.question}
      {!q.required && <span className="muted"> (optional)</span>}
      {q.hint && <span className="pen-questions__hint">{q.hint}</span>}
    </>
  );
  if (q.kind === 'yesNo' || q.kind === 'choice') {
    return (
      <fieldset className="pen-questions__q" data-question={q.id}>
        <legend>{label}</legend>
        <div className="pen-questions__options">
          {q.options!.map((o) => (
            <label key={o} className="pen-questions__option">
              <input type="radio" name={name} value={o} required={q.required} defaultChecked={text(name) === o} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (q.kind === 'multi') {
    return (
      <fieldset className="pen-questions__q" data-question={q.id}>
        <legend>{label}</legend>
        <div className="pen-questions__options">
          {q.options!.map((o, i) => (
            <label key={o} className="pen-questions__option">
              <input type="checkbox" name={`${name}:${i}`} defaultChecked={ticked(`${name}:${i}`)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="pen-questions__q" data-question={q.id}>
      <span>{label}</span>
      {q.kind === 'number' ? (
        <input name={name} type="number" min={q.min} max={q.max} step="0.1" required={q.required} defaultValue={text(name)} />
      ) : (
        <input name={name} maxLength={500} required={q.required} defaultValue={text(name)} />
      )}
    </label>
  );
}
