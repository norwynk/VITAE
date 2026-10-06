'use client';
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { firebaseRepository } from '@/services/repository';
import { firebaseConfigured } from '@/services/firebase';
import { Notice, formValues } from './ui';

/**
 * Live-mode sign-in. Members self-register with email and password and must
 * verify their email. Staff roles are assigned by admin tooling and need a
 * second factor in production; MFA enrolment UI is not built yet.
 */
export function LiveAuthGate({ onReady, error }: { onReady: () => Promise<void>; error: string | null }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped after user.reload(), which mutates the same User object in place.
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!firebaseConfigured()) return;
    let unsub = () => {};
    void (async () => {
      const [{ onAuthStateChanged }, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
      unsub = onAuthStateChanged(firebase().auth, setUser);
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.emailVerified) return;
    void (async () => {
      try {
        const claims = (await user.getIdTokenResult()).claims;
        if (!claims.role || claims.role === 'MEMBER') {
          const r = await firebaseRepository.provisionMember();
          if (r.refreshToken) await user.getIdToken(true);
        }
        await onReady();
      } catch (e) {
        setMessage((e as Error).message);
      }
    })();
  }, [user, reloads, onReady]);

  if (!firebaseConfigured()) {
    return (
      <Notice tone="warn">
        Live mode is selected but Firebase is not configured for this environment, so sign-in is unavailable. Set the
        NEXT_PUBLIC_FIREBASE_* variables, or run in demo mode.
      </Notice>
    );
  }
  if (user === undefined) return <p className="muted">Checking your session…</p>;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () =>
    act(async () => {
      const [{ signOut: fbSignOut }, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
      await fbSignOut(firebase().auth);
    });

  if (user && !user.emailVerified) {
    return (
      <section className="card stack">
        <h1>Verify your email</h1>
        <p>We sent a verification link to {user.email}. Open it, then continue.</p>
        {message && <Notice tone="error">{message}</Notice>}
        <div className="row">
          <button type="button" disabled={busy} onClick={() => act(async () => {
              await user.reload();
              if (!user.emailVerified) setMessage('Your email is not verified yet.');
              else {
                await user.getIdToken(true);
                setReloads((n) => n + 1);
              }
            })}>
            I have verified my email
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => act(async () => {
              const { sendEmailVerification } = await import('firebase/auth');
              await sendEmailVerification(user);
              setMessage('Verification email sent.');
            })}>
            Resend email
          </button>
          <button type="button" className="secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="card stack">
        <p className="muted">Signed in as {user.email}. Loading your workspace…</p>
        {(message || error) && <Notice tone="error">{message || error}</Notice>}
        <div className="row">
          <button type="button" className="secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card stack" style={{ maxWidth: 480 }}>
      <h1>Sign in</h1>
      {message && <Notice tone="error">{message}</Notice>}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const v = formValues(e.currentTarget);
          void act(async () => {
            const [auth, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
            if (submitter?.value === 'register') {
              const cred = await auth.createUserWithEmailAndPassword(firebase().auth, v.email, v.password);
              await auth.sendEmailVerification(cred.user);
            } else {
              await auth.signInWithEmailAndPassword(firebase().auth, v.email, v.password);
            }
          });
        }}
      >
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" minLength={10} required />
        </label>
        <div className="row">
          <button type="submit" value="signin" disabled={busy}>
            Sign in
          </button>
          <button type="submit" value="register" className="secondary" disabled={busy}>
            Create member account
          </button>
        </div>
      </form>
    </section>
  );
}
