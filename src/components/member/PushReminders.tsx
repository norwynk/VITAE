'use client';
import { useEffect, useState } from 'react';
import { firebaseRepository } from '@/services/repository';
import { Notice } from '../ui';
import { useWorkspace } from '../workspace-context';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
const DONE_KEY = 'prick:push';

type State = 'checking' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'blocked';

/** iPhones only allow web notifications once the site is on the Home Screen. */
function needsHomeScreen(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !installed;
}

/**
 * Dose reminders on the member's phone. One tap asks the phone for
 * permission, registers it, and from then on reminders arrive even when
 * PRICK isn't open. Live site only, and only once the web push key is set.
 */
export function PushReminders() {
  const { workspace } = useWorkspace();
  const [state, setState] = useState<State>('checking');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (needsHomeScreen()) return setState('ios-install');
      const { isSupported } = await import('firebase/messaging');
      if (!('Notification' in window) || !(await isSupported())) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('blocked');
      let done = false;
      try {
        done = localStorage.getItem(DONE_KEY) === workspace.actor.uid;
      } catch {
        done = false;
      }
      setState(Notification.permission === 'granted' && done ? 'on' : 'off');
    })();
  }, [workspace.actor.uid]);

  if (workspace.mode !== 'live' || !VAPID_KEY || state === 'checking' || state === 'unsupported') return null;

  if (state === 'on') return <p className="small">✓ Reminders are on for this phone.</p>;
  if (state === 'blocked') {
    return <Notice tone="info">Notifications are blocked for PRICK on this phone. Allow them in your phone&apos;s settings to get dose reminders.</Notice>;
  }
  if (state === 'ios-install') {
    return (
      <Notice tone="info">
        To get dose reminders on your iPhone: tap the <strong>Share</strong> button, choose <strong>Add to Home Screen</strong>, then open
        PRICK from your Home Screen and turn reminders on here.
      </Notice>
    );
  }
  return (
    <div className="row">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setProblem(null);
          try {
            if ((await Notification.requestPermission()) !== 'granted') return setState('blocked');
            const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
            const [{ getMessaging, getToken }, { firebase }] = await Promise.all([import('firebase/messaging'), import('@/services/firebase')]);
            const token = await getToken(getMessaging(firebase().app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
            await firebaseRepository.registerPushToken(token);
            try {
              localStorage.setItem(DONE_KEY, workspace.actor.uid);
            } catch {
              // Storage unavailable: the button just shows again next time.
            }
            setState('on');
          } catch (e) {
            setProblem((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Turn on reminders
      </button>
      {problem && <Notice tone="error">{problem}</Notice>}
    </div>
  );
}
