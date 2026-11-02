'use client';
import { useEffect, useRef, useState } from 'react';
import { type PenRelease, formatRand } from '@/domain/model';
import { firebaseRepository } from '@/services/repository';
import { Notice } from '../ui';
import { useWorkspace } from '../workspace-context';

/** Sends the member to Paystack's secure checkout for an approved pen. Card details never touch PRICK. */
export function PayButton({ release }: { release: PenRelease }) {
  const [state, setState] = useState<'idle' | 'opening' | 'error'>('idle');
  const [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className="btn light"
        disabled={state === 'opening'}
        onClick={async () => {
          setState('opening');
          try {
            const { url } = await firebaseRepository.startPayment(release.id);
            window.location.assign(url);
          } catch (e) {
            setError((e as Error).message || 'Payment couldn’t be started. Nothing was charged. Please try again.');
            setState('error');
          }
        }}
      >
        {state === 'opening' ? 'Opening secure payment…' : `Pay ${formatRand(release.amountCents ?? 0)}`}
      </button>
      {state === 'error' && <p className="small" role="alert" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </>
  );
}

/**
 * Back from Paystack (?paid=<release>): checks with the server, which asks
 * Paystack, then refreshes the dashboard. Never takes the browser's word.
 */
export function PaymentReturn() {
  const { refresh } = useWorkspace();
  const [releaseId] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('paid')));
  const [status, setStatus] = useState<'checking' | 'PAID' | 'PENDING' | 'FAILED' | 'error' | null>(releaseId ? 'checking' : null);
  // Once per return: refreshing the dashboard must not start another check.
  const started = useRef(false);

  useEffect(() => {
    if (!releaseId || started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('paid');
    url.searchParams.delete('trxref');
    url.searchParams.delete('reference');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    void (async () => {
      // Paystack can take a moment to settle: ask a few times before calling it pending.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const { status: s } = await firebaseRepository.confirmPayment(releaseId);
          if (s !== 'PENDING' || attempt === 3) {
            // The dashboard catches up first, so the notice and the page agree.
            if (s === 'PAID') await refresh();
            setStatus(s);
            return;
          }
        } catch {
          setStatus('error');
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    })();
  }, [releaseId, refresh]);

  if (!status) return null;
  if (status === 'checking') return <Notice>Checking your payment with Paystack…</Notice>;
  if (status === 'PAID') return <Notice tone="ok">Payment received, thank you. Your care team is getting your pen ready and you’ll get a receipt by email.</Notice>;
  if (status === 'PENDING') return <Notice tone="warn">Your payment hasn’t come through yet. If you finished paying, it will show here within a few minutes. If you didn’t, you can try again below.</Notice>;
  if (status === 'FAILED') return <Notice tone="error">That payment didn’t go through and you weren’t charged. Please try again, or use a different card.</Notice>;
  return <Notice tone="warn">We couldn’t check your payment just now. If you paid, it will show here shortly. Nothing is charged twice.</Notice>;
}
