'use client';
import { useState } from 'react';
import { firebaseRepository } from '@/services/repository';
import { Card, Notice } from '../ui';
import { useWorkspace } from '../workspace-context';

/** One click: a clearly labelled test email to the clinician and the admins, through the real sending route. */
export function EmailCheck() {
  const { workspace } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const live = workspace.mode === 'live';
  return (
    <Card title="Email check">
      <p className="muted small" style={{ marginTop: 0 }}>
        Sends a short email marked <strong>[TEST]</strong> to the clinician and the admins, the same way real alerts are sent.
        Use it to check alerts are reaching your inboxes.
      </p>
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      {live ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setResult(null);
            try {
              const r = await firebaseRepository.sendTeamTestEmail();
              setResult({ tone: 'ok', text: `Sent from ${r.from} to ${r.to.join(' and ')}. Check those inboxes (and spam) in a minute or two.` });
            } catch (e) {
              setResult({ tone: 'error', text: (e as Error).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Sending…' : 'Send a test email'}
        </button>
      ) : (
        <p className="small muted">Emails only go out on the live site.</p>
      )}
    </Card>
  );
}
