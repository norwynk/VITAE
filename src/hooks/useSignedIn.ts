'use client';
import { useEffect, useState } from 'react';
import { publicDataMode } from '@/config';
import { firebaseConfigured } from '@/services/firebase';

/** Whether someone is signed in on this device (live site), so we never ask them to make an account they already have. */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (publicDataMode() !== 'live' || !firebaseConfigured()) return;
    let unsub: (() => void) | undefined;
    let live = true;
    void Promise.all([import('firebase/auth'), import('@/services/firebase')]).then(([{ onAuthStateChanged }, { firebase }]) => {
      if (live) unsub = onAuthStateChanged(firebase().auth, (u) => setSignedIn(Boolean(u)));
    });
    return () => {
      live = false;
      unsub?.();
    };
  }, []);
  return signedIn;
}
