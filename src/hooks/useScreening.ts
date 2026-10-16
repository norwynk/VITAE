'use client';
import { useCallback, useSyncExternalStore } from 'react';
import type { IntakeAnswers } from '@/domain/intake';

/**
 * The questionnaire in progress, kept on this device until the member has an
 * account and sends it. Never holds an identity number. Cleared on submit.
 */
export interface ScreeningState {
  answers: IntakeAnswers;
  /** Pen-specific answers, keyed by question id. */
  penAnswers: Record<string, string>;
  letClinicianSuggest: boolean;
  /** Index of the screen they reached. */
  step: number;
  completedAt?: string;
}

const KEY = 'prick:screening';
const EVENT = 'prick:screening';
const EMPTY: ScreeningState = { answers: {}, penAnswers: {}, letClinicianSuggest: false, step: 0 };

let cache: { raw: string | null; value: ScreeningState } = { raw: null, value: EMPTY };

function snapshot(): ScreeningState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) {
    let value = EMPTY;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && parsed.answers && typeof parsed.answers === 'object') value = { ...EMPTY, ...parsed };
    } catch {
      value = EMPTY;
    }
    cache = { raw, value };
  }
  return cache.value;
}

function write(next: ScreeningState | null) {
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode): answers live for this visit only.
    cache = { raw: next ? JSON.stringify(next) : null, value: next ?? EMPTY };
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useScreening() {
  const state = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const update = useCallback((patch: Partial<ScreeningState> | ((s: ScreeningState) => Partial<ScreeningState>)) => {
    const now = snapshot();
    write({ ...now, ...(typeof patch === 'function' ? patch(now) : patch) });
  }, []);
  const clear = useCallback(() => write(null), []);
  return { state, update, clear, complete: Boolean(state.completedAt) };
}
