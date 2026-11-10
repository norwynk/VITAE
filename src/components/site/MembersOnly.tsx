'use client';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { publicDataMode } from '@/config';
import { repository } from '@/services/repository';

async function signedIn(): Promise<boolean> {
  if (publicDataMode() !== 'live') return true;
  const { firebase } = await import('@/services/firebase');
  const { auth } = firebase();
  await auth.authStateReady();
  return Boolean(auth.currentUser);
}

/**
 * Treatment information is only for people who have finished their assessment.
 * Nothing inside renders on the server or for a visitor: strangers go to the
 * assessment, and someone part-way through goes back to their account.
 */
export function MembersOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        if (!(await signedIn())) {
          if (live) router.replace('/start');
          return;
        }
        const { actor, store } = await repository().getWorkspace();
        if (!live) return;
        if (actor.role === 'MEMBER' && !store.members[actor.uid]?.onboardedAt) router.replace('/app');
        else setAllowed(true);
      } catch {
        if (live) router.replace(publicDataMode() === 'live' ? '/app' : '/start');
      }
    })();
    return () => {
      live = false;
    };
  }, [router]);
  if (allowed) return <>{children}</>;
  return (
    <main className="container narrow" aria-busy="true" style={{ padding: 'var(--section) var(--gutter)' }}>
      <p className="muted">One moment…</p>
    </main>
  );
}
