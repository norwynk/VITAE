'use client';
import { useState } from 'react';
import { type IntakeQuestion, type IntakeValue, type MedRow, NONE } from '@/domain/intake';

/** One questionnaire answer control. Controlled: `value` in, `onChange` out. */
export function Field({ q, value, onChange, options }: { q: IntakeQuestion; value: IntakeValue | undefined; onChange: (v: IntakeValue | undefined) => void; options?: readonly string[] }) {
  const label = (
    <>
      <span className="qf__label">
        {q.label}
        {!q.required && <span className="qf__opt"> (optional)</span>}
      </span>
      {q.hint && <span className="qf__hint">{q.hint}</span>}
    </>
  );
  const text = typeof value === 'string' ? value : '';

  switch (q.kind) {
    case 'text':
    case 'number':
    case 'date':
    case 'time':
      return (
        <label className="qf" data-q={q.id}>
          {label}
          <input
            type={q.kind === 'text' ? 'text' : q.kind}
            value={text}
            min={q.min}
            max={q.max}
            step={q.kind === 'number' ? 'any' : undefined}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            autoComplete={q.id === 'firstName' ? 'given-name' : undefined}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </label>
      );
    case 'long':
      return (
        <label className="qf" data-q={q.id}>
          {label}
          <textarea value={text} maxLength={q.maxLength} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value || undefined)} />
        </label>
      );
    case 'choice': {
      const opts = options ?? q.options ?? [];
      if (opts.length > 7) {
        return (
          <label className="qf" data-q={q.id}>
            {label}
            <select value={text} onChange={(e) => onChange(e.target.value || undefined)}>
              <option value="">Choose…</option>
              {opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        );
      }
      return (
        <fieldset className="qf qf--chips" data-q={q.id}>
          <legend>{label}</legend>
          <div className="qf__chips" role="radiogroup">
            {opts.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={text === o} className="qf__chip" onClick={() => onChange(text === o ? undefined : o)}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      );
    }
    case 'multi': {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      const exclusive = (o: string) => /^(None|No cramps)/.test(o);
      return (
        <fieldset className="qf qf--chips" data-q={q.id}>
          <legend>{label}</legend>
          <div className="qf__chips">
            {(q.options ?? []).map((o) => {
              const on = picked.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  className="qf__chip"
                  onClick={() => {
                    const next = on ? picked.filter((x) => x !== o) : exclusive(o) ? [o] : [...picked.filter((x) => !exclusive(x)), o];
                    onChange(next.length ? next : undefined);
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case 'tags':
      return <Tags q={q} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} label={label} />;
    case 'meds':
      return <Meds q={q} value={Array.isArray(value) ? (value as (MedRow | string)[]) : []} onChange={onChange} label={label} />;
    case 'rank': {
      const items = q.suggestions ?? [];
      const nums = Array.isArray(value) ? (value as string[]) : items.map(() => '');
      return (
        <fieldset className="qf" data-q={q.id}>
          <legend>{label}</legend>
          <ol className="qf__rank">
            {items.map((item, i) => (
              <li key={item}>
                <select
                  aria-label={`Number for: ${item}`}
                  value={nums[i] ?? ''}
                  onChange={(e) => {
                    const next = items.map((_, j) => (j === i ? e.target.value : (nums[j] ?? '')));
                    onChange(next.some(Boolean) ? next : undefined);
                  }}
                >
                  <option value="">–</option>
                  {items.map((_, n) => (
                    <option key={n} value={String(n + 1)}>
                      {n + 1}
                    </option>
                  ))}
                </select>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </fieldset>
      );
    }
  }
}

function Tags({ q, value, onChange, label }: { q: IntakeQuestion; value: string[]; onChange: (v: IntakeValue | undefined) => void; label: React.ReactNode }) {
  const [typed, setTyped] = useState('');
  const none = value.includes(NONE);
  const items = value.filter((v) => v !== NONE);
  const has = (v: string) => items.some((i) => i.toLowerCase() === v.toLowerCase());
  const set = (next: string[]) => onChange(next.length ? next : undefined);
  const toggle = (v: string) => set(has(v) ? items.filter((i) => i.toLowerCase() !== v.toLowerCase()) : [...items, v]);
  const add = () => {
    const v = typed.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (v && !has(v) && v.toLowerCase() !== NONE.toLowerCase()) set([...items, v]);
    setTyped('');
  };
  const own = items.filter((i) => !(q.suggestions ?? []).some((s) => s.toLowerCase() === i.toLowerCase()));
  return (
    <fieldset className="qf qf--tags" data-q={q.id}>
      <legend>{label}</legend>
      <div className="qf__chips">
        {(q.suggestions ?? []).map((s) => (
          <button key={s} type="button" className="qf__chip" aria-pressed={has(s)} onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
        {own.map((s) => (
          <button key={s} type="button" className="qf__chip" aria-pressed aria-label={`Remove ${s}`} onClick={() => toggle(s)}>
            {s} ×
          </button>
        ))}
      </div>
      <div className="qf__add">
        <input
          value={typed}
          maxLength={120}
          placeholder="Something else? Type it here"
          aria-label={`Add something else to ${q.label.toLowerCase()}`}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="secondary small" onClick={add} disabled={!typed.trim()}>
          Add
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={none} onChange={(e) => onChange(e.target.checked ? [NONE] : undefined)} /> {q.noneLabel}
      </label>
    </fieldset>
  );
}

const BLANK: MedRow = { name: '', dose: '', frequency: '', reason: '' };

function Meds({ q, value, onChange, label }: { q: IntakeQuestion; value: (MedRow | string)[]; onChange: (v: IntakeValue | undefined) => void; label: React.ReactNode }) {
  const none = value.includes(NONE);
  const rows = (value.filter((r) => r !== NONE) as MedRow[]).length ? (value.filter((r) => r !== NONE) as MedRow[]) : [];
  const [draft, setDraft] = useState<MedRow[]>(rows.length ? rows : [BLANK]);
  const commit = (next: MedRow[]) => {
    setDraft(next);
    const filled = next.filter((r) => r.name.trim());
    onChange(filled.length ? filled : undefined);
  };
  return (
    <fieldset className="qf qf--meds" data-q={q.id}>
      <legend>{label}</legend>
      {!none && (
        <div className="qf__meds">
          <div className="qf__meds-head" aria-hidden="true">
            <span>Name</span>
            <span>Dose</span>
            <span>How often</span>
            <span>What for</span>
          </div>
          {draft.map((r, i) => (
            <div key={i} className="qf__meds-row">
              {(['name', 'dose', 'frequency', 'reason'] as const).map((k) => (
                <input
                  key={k}
                  value={r[k]}
                  maxLength={200}
                  aria-label={`${k === 'frequency' ? 'How often' : k === 'reason' ? 'What for' : k[0].toUpperCase() + k.slice(1)}, row ${i + 1}`}
                  placeholder={{ name: 'e.g. Vitamin D', dose: '1000 IU', frequency: 'Once a day', reason: 'Low levels' }[k]}
                  onChange={(e) => commit(draft.map((d, j) => (j === i ? { ...d, [k]: e.target.value } : d)))}
                />
              ))}
              {draft.length > 1 && (
                <button type="button" className="secondary small" aria-label={`Remove row ${i + 1}`} onClick={() => commit(draft.filter((_, j) => j !== i))}>
                  ×
                </button>
              )}
            </div>
          ))}
          {draft.length < 30 && (
            <button type="button" className="secondary small" onClick={() => setDraft([...draft, BLANK])}>
              Add another
            </button>
          )}
        </div>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={none}
          onChange={(e) => {
            if (e.target.checked) onChange([NONE]);
            else commit(draft);
          }}
        />{' '}
        {q.noneLabel}
      </label>
    </fieldset>
  );
}
