'use client';
import { useEffect, useState } from 'react';
import type { MultiFactorResolver, TotpSecret, User } from 'firebase/auth';
import { MFA_REQUIRED_ROLES, type Role } from '@/domain/model';
import { firebaseRepository } from '@/services/repository';
import { firebaseConfigured } from '@/services/firebase';
import { Notice, formValues } from './ui';

/**
 * Live-mode sign-in. Members create an account with email and password and
 * verify their email. Staff roles are assigned by admin tooling and must use
 * an authenticator app as a second step: they enrol here on first sign-in.
 */
export function LiveAuthGate({ onReady, error }: { onReady: () => Promise<void>; error: string | null }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signup' | 'signin' | 'reset'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('signup') ? 'signup' : 'signin',
  );
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [enrol, setEnrol] = useState(false);
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
        const [{ multiFactor }] = await Promise.all([import('firebase/auth')]);
        const role = (await user.getIdTokenResult()).claims.role as Role | undefined;
        if (role && MFA_REQUIRED_ROLES.includes(role) && multiFactor(user).enrolledFactors.length === 0) {
          setEnrol(true);
          return;
        }
        if (!role || role === 'MEMBER') {
          const r = await firebaseRepository.provisionMember();
          if (r.refreshToken) await user.getIdToken(true);
        }
        await onReady();
      } catch (e) {
        setMessage({ tone: 'error', text: friendly(e) });
      }
    })();
  }, [user, reloads, onReady]);

  if (!firebaseConfigured()) {
    return <Notice tone="warn">Sign-in isn&apos;t available right now. Please try again later.</Notice>;
  }
  if (user === undefined) return <p className="muted">Checking your session…</p>;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: 'error', text: friendly(e) });
    } finally {
      setBusy(false);
    }
  };

  const signOut = () =>
    act(async () => {
      await signOutEverywhere();
      setEnrol(false);
      setResolver(null);
    });

  const shown = message ?? (error ? { tone: 'error' as const, text: error } : null);
  const note = shown && <Notice tone={shown.tone === 'ok' ? 'ok' : 'error'}>{shown.text}</Notice>;

  if (resolver) {
    return (
      <AuthCard title="Enter your code" lead="Open your authenticator app and type the 6-digit code for PRICK.">
        {note}
        <CodeForm
          busy={busy}
          label="Sign in"
          onCode={(code) =>
            act(async () => {
              const { TotpMultiFactorGenerator } = await import('firebase/auth');
              const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? resolver.hints[0];
              await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
              setResolver(null);
            })
          }
        />
        <button type="button" className="link-arrow" onClick={() => setResolver(null)}>
          Back
        </button>
      </AuthCard>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <AuthCard title="Check your inbox." lead={`We sent a link to ${user.email}. Tap it to confirm it's you, then come back here.`}>
        <p className="muted small">Can&apos;t see it? Check your spam or promotions folder.</p>
        {note}
        <div className="row">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await user.reload();
                if (!user.emailVerified) throw new Error('Not confirmed yet. Tap the link in the email first.');
                await user.getIdToken(true);
                setReloads((n) => n + 1);
              })
            }
          >
            I&apos;ve confirmed my email
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await sendVerification(user);
                setMessage({ tone: 'ok', text: 'Sent again. It can take a minute to arrive.' });
              })
            }
          >
            Send it again
          </button>
          <button type="button" className="secondary" onClick={signOut}>
            Use a different email
          </button>
        </div>
      </AuthCard>
    );
  }

  if (user && enrol) return <EnrolTotp user={user} onDone={signOut} />;

  if (user) {
    return (
      <section className="card stack">
        <p className="muted">Signed in as {user.email}. Loading your account…</p>
        {note}
        <div className="row">
          <button type="button" className="secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  if (mode === 'reset') {
    return (
      <AuthCard title="Reset your password." lead="Enter your email and we'll send you a link to choose a new password.">
        {note}
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const v = formValues(e.currentTarget);
            void act(async () => {
              const [{ sendPasswordResetEmail }, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
              try {
                await sendPasswordResetEmail(firebase().auth, v.email, continueSettings());
              } catch (err) {
                if ((err as { code?: string }).code !== 'auth/unauthorized-continue-uri') throw err;
                await sendPasswordResetEmail(firebase().auth, v.email);
              }
              setMessage({ tone: 'ok', text: "If there's an account for that email, a reset link is on its way." });
            });
          }}
        >
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <div className="row">
            <button type="submit" disabled={busy}>
              Send reset link
            </button>
            <button type="button" className="link-arrow" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          </div>
        </form>
      </AuthCard>
    );
  }

  const signup = mode === 'signup';
  return (
    <AuthCard
      title={signup ? 'Create your account.' : 'Welcome back.'}
      lead={
        signup
          ? 'Your answers are waiting. Make an account to send them to your clinician.'
          : 'Sign in to see your pens and your clinician’s replies.'
      }
    >
      {note}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const v = formValues(e.currentTarget);
          void act(async () => {
            const [auth, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
            if (signup) {
              const cred = await auth.createUserWithEmailAndPassword(firebase().auth, v.email, v.password);
              await sendVerification(cred.user);
              return;
            }
            try {
              await auth.signInWithEmailAndPassword(firebase().auth, v.email, v.password);
            } catch (err) {
              if ((err as { code?: string }).code !== 'auth/multi-factor-auth-required') throw err;
              setResolver(auth.getMultiFactorResolver(firebase().auth, err as Parameters<typeof auth.getMultiFactorResolver>[1]));
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
          <input
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            minLength={signup ? 10 : undefined}
            required
          />
          {signup && <span className="small muted">At least 10 characters.</span>}
        </label>
        <div className="row">
          <button type="submit" disabled={busy}>
            {signup ? 'Create my account' : 'Sign in'}
          </button>
          {!signup && (
            <button type="button" className="link-arrow" onClick={() => setMode('reset')}>
              Forgot your password?
            </button>
          )}
        </div>
      </form>
      <p className="small">
        {signup ? 'Already have an account? ' : 'New here? '}
        <button type="button" className="link-arrow" onClick={() => setMode(signup ? 'signin' : 'signup')}>
          {signup ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      {signup && (
        <p className="small muted">
          By creating an account you agree to our <a href="/terms">terms</a>. See how we look after your information in our{' '}
          <a href="/privacy">privacy notice</a>.
        </p>
      )}
    </AuthCard>
  );
}

/** Signed-in strip above the account, with the way out. */
export function LiveAccountBar({ onSignedOut }: { onSignedOut: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void import('@/services/firebase').then(({ firebase }) => setEmail(firebase().auth.currentUser?.email ?? null));
  }, []);
  return (
    <div className="container toolbar">
      <span className="muted small">{email ? `Signed in as ${email}` : 'Signed in'}</span>
      <button
        type="button"
        className="secondary small"
        onClick={async () => {
          await signOutEverywhere();
          onSignedOut();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

function AuthCard({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="card stack auth-card">
      <h1 className="display auth-card__title">{title}</h1>
      <p>{lead}</p>
      {children}
    </section>
  );
}

function CodeForm({ busy, label, onCode }: { busy: boolean; label: string; onCode: (code: string) => void }) {
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        onCode(formValues(e.currentTarget).code.replace(/\s/g, ''));
      }}
    >
      <label>
        6-digit code
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required style={{ width: '9rem' }} />
      </label>
      <button type="submit" disabled={busy}>
        {label}
      </button>
    </form>
  );
}

/** First sign-in for staff: link an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). */
function EnrolTotp({ user, onDone }: { user: User; onDone: () => Promise<void> }) {
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [{ TotpMultiFactorGenerator, multiFactor }, QR] = await Promise.all([import('firebase/auth'), import('qrcode')]);
        const s = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
        setSecret(s);
        setQr(await QR.toDataURL(s.generateQrCodeUrl(user.email ?? 'PRICK staff', 'PRICK'), { margin: 1, width: 220 }));
      } catch (e) {
        setProblem(friendly(e));
      }
    })();
  }, [user]);

  if (done) {
    return (
      <AuthCard title="You're set up." lead="From now on, sign in with your password and then a code from your authenticator app.">
        <div>
          <button type="button" onClick={() => void onDone()}>
            Sign in again
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="One more lock on the door."
      lead="Staff accounts can see health information, so they need a second step. Scan this with an authenticator app on your phone (Google Authenticator or Microsoft Authenticator both work), then type the code it shows."
    >
      {problem && <Notice tone="error">{problem}</Notice>}
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR code for your authenticator app" width={220} height={220} style={{ background: '#fff', borderRadius: 8 }} />
      )}
      {secret && (
        <p className="small muted">
          Can&apos;t scan? Add it by hand with this key: <code style={{ userSelect: 'all' }}>{secret.secretKey}</code>
        </p>
      )}
      {secret && (
        <CodeForm
          busy={busy}
          label="Turn it on"
          onCode={async (code) => {
            setBusy(true);
            setProblem(null);
            try {
              const { TotpMultiFactorGenerator, multiFactor } = await import('firebase/auth');
              await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Authenticator app');
              setDone(true);
            } catch (e) {
              setProblem(friendly(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <button type="button" className="link-arrow" onClick={() => void onDone()}>
        Sign out
      </button>
    </AuthCard>
  );
}

function continueSettings() {
  return { url: `${window.location.origin}/app` };
}

/** Verification email that brings them back to their account; plain link if this site isn't an authorised domain yet. */
async function sendVerification(user: User) {
  const { sendEmailVerification } = await import('firebase/auth');
  try {
    await sendEmailVerification(user, continueSettings());
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/unauthorized-continue-uri') throw e;
    await sendEmailVerification(user);
  }
}

async function signOutEverywhere() {
  const [{ signOut }, { firebase }] = await Promise.all([import('firebase/auth'), import('@/services/firebase')]);
  await signOut(firebase().auth);
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'There is already an account with that email. Sign in instead, or reset your password.',
  'auth/invalid-credential': "That email and password don't match. Try again, or reset your password.",
  'auth/wrong-password': "That email and password don't match. Try again, or reset your password.",
  'auth/user-not-found': "That email and password don't match. Try again, or reset your password.",
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/weak-password': 'Choose a longer password: at least 10 characters.',
  'auth/password-does-not-meet-requirements': 'Choose a longer password: at least 10 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': "We couldn't reach the server. Check your connection and try again.",
  'auth/invalid-verification-code': "That code didn't work. Check the app and try the newest code.",
  'auth/requires-recent-login': 'For your security, sign out and sign in again, then try once more.',
};

function friendly(e: unknown): string {
  const err = e as { code?: string; message?: string };
  return (err.code && AUTH_MESSAGES[err.code]) || err.message || 'Something went wrong. Please try again.';
}
