'use client';
import { type PenQuestion, NONE_OF_THESE, splitMulti } from '@/domain/penQuestions';
import type { PenSafety } from '@/domain/penSafety';

/** What someone must know about a pen, and its own safety questions. Only ever shown inside the account. */
export function GoodToKnow({ name, safety }: { name: string; safety: PenSafety }) {
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

export function PenField({ q, value, onChange }: { q: PenQuestion; value: string; onChange: (v: string) => void }) {
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
