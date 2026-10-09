'use client';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * "My pens": the pens someone wants to ask a clinician about, kept in this
 * browser until they sign up. A preference only, never a clinical input.
 */
export const MAX_SHORTLIST = 3;
const KEY = 'prick:shortlist';
const EVENT = 'prick:shortlist';

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, MAX_SHORTLIST) : [];
  } catch {
    return [];
  }
}

let cache: { raw: string | null; list: string[] } = { raw: null, list: [] };
function snapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, list: read() };
  return cache.list;
}

const EMPTY: string[] = [];

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SHORTLIST)));
  } catch {
    // Storage unavailable (private mode): the shortlist just won't persist.
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

export function useShortlist() {
  const slugs = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const add = useCallback((slug: string) => {
    const now = read();
    if (now.includes(slug) || now.length >= MAX_SHORTLIST) return false;
    write([...now, slug]);
    return true;
  }, []);
  const remove = useCallback((slug: string) => write(read().filter((s) => s !== slug)), []);
  const clear = useCallback(() => write([]), []);
  return { slugs, add, remove, clear, full: slugs.length >= MAX_SHORTLIST, has: (slug: string) => slugs.includes(slug) };
}
