'use client';
import { useState } from 'react';

/** Stored value when the member ticks the "none" box, so "nothing" is an answer, not a blank. */
export const NONE = 'None';

function parse(value: string | undefined): { items: string[]; none: boolean } {
  if (!value) return { items: [], none: false };
  if (value === NONE) return { items: [], none: true };
  return { items: value.split(',').map((x) => x.trim()).filter(Boolean), none: false };
}

/**
 * Tap-to-pick answers with room for anything else in the member's own words.
 * The answer travels in a hidden input named `name`, as a comma-separated list
 * or `None`, so it reads like any other form field and saves with the draft.
 */
export function TagPicker({
  name,
  label,
  hint,
  suggestions,
  noneLabel,
  initial,
}: {
  name: string;
  label: string;
  hint?: string;
  suggestions: string[];
  noneLabel: string;
  initial?: string;
}) {
  const [{ items, none }, setAnswer] = useState(() => parse(initial));
  const [text, setText] = useState('');

  const has = (v: string) => items.some((i) => i.toLowerCase() === v.toLowerCase());
  const toggle = (v: string) =>
    setAnswer({ items: has(v) ? items.filter((i) => i.toLowerCase() !== v.toLowerCase()) : [...items, v], none: false });
  const addTyped = () => {
    // Commas separate answers, so they can't appear inside one.
    const v = text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (v && !has(v)) setAnswer({ items: [...items, v], none: false });
    setText('');
  };
  const own = items.filter((i) => !suggestions.some((s) => s.toLowerCase() === i.toLowerCase()));

  return (
    <fieldset className="tags">
      <legend>{label}</legend>
      {hint && <p className="muted small tags__hint">{hint}</p>}
      <input type="hidden" name={name} value={none ? NONE : items.join(', ')} />
      <div className="tags__options">
        {suggestions.map((s) => (
          <button key={s} type="button" className="tags__chip" aria-pressed={has(s)} onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
        {own.map((s) => (
          <button key={s} type="button" className="tags__chip" aria-pressed onClick={() => toggle(s)} aria-label={`Remove ${s}`}>
            {s} ×
          </button>
        ))}
      </div>
      <div className="tags__add">
        <input
          value={text}
          placeholder="Something else? Type it here"
          aria-label={`Add something else to ${label.toLowerCase()}`}
          maxLength={120}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTyped();
            }
          }}
        />
        <button type="button" className="secondary small" onClick={addTyped} disabled={!text.trim()}>
          Add
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={none} onChange={(e) => setAnswer({ items: e.target.checked ? [] : items, none: e.target.checked })} />{' '}
        {noneLabel}
      </label>
    </fieldset>
  );
}
