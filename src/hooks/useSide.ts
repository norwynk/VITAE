'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { SIDE_KEY, type Side } from '@/brand/sides';

/**
 * Which door they took, remembered in this browser. The page's theme comes
 * from <html data-side>, set before first paint by the script in the root
 * layout, so this hook only drives what the page lists.
 */
const EVENT = 'prick:side';

function read(): Side | null {
  // The men's pages are the men's side, whatever was chosen before.
  if (document.documentElement.dataset.side === 'men') return 'men';
  try {
    const v = window.localStorage.getItem(SIDE_KEY);
    return v === 'men' || v === 'women' ? v : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Remember the door and switch the theme straight away. */
export function rememberSide(side: Side) {
  try {
    window.localStorage.setItem(SIDE_KEY, side);
  } catch {
    // Storage unavailable (private mode): the doors just show again next visit.
  }
  const html = document.documentElement;
  html.dataset.side = side;
  html.classList.remove('choose-side');
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Go to their side. On the two homepages that means the other homepage: the
 * screen stays filled with light (html.door-through) until the new page
 * mounts and calls finishWalkThrough, so the old page never shows in the new
 * colours. Anywhere else the page simply switches in place.
 */
export function walkThrough(side: Side, path: string, push: (href: string) => void) {
  const target = side === 'men' && path === '/' ? '/men' : side === 'women' && path === '/men' ? '/' : null;
  if (!target) return rememberSide(side);
  const html = document.documentElement;
  html.dataset.pendingSide = side;
  html.classList.add('door-through');
  push(target);
}

export function finishWalkThrough() {
  const html = document.documentElement;
  const side = html.dataset.pendingSide;
  if (side !== 'men' && side !== 'women') return;
  delete html.dataset.pendingSide;
  html.classList.remove('door-through');
  rememberSide(side);
}

export function useSide() {
  const side = useSyncExternalStore(subscribe, read, () => null);
  const choose = useCallback((s: Side) => rememberSide(s), []);
  return { side, choose };
}
