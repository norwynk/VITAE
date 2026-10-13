'use client';
import { useState } from 'react';
import { type RepeatDelivery, RENEWAL_LEAD_DAYS, isApprovalCurrent, localDate } from '@/domain/model';
import { Badge, Card, Empty, Notice, formValues } from '../ui';
import { useWorkspace } from '../workspace-context';

const STOP_REASONS = ["I've reached my goal", 'Taking a break', 'Side effects', 'Too expensive', 'Something else'];

/** Renewal check-ins open before the pen runs out; this says which pens have one open now. */
export function renewalsDue(repeats: RepeatDelivery[], today: string): RepeatDelivery[] {
  return repeats.filter((r) => r.status === 'ACTIVE' && !r.holdFollowUpId && today >= r.checkInOpensOn);
}

function fmtDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
}

/**
 * On repeat: after the first approved pen, the next one ships after a quick
 * check-in about ten days before it runs out. Uses the clinician's approved
 * packs; flagged check-ins wait for the clinician.
 */
export function OnRepeat() {
  const { workspace, run, busy } = useWorkspace();
  const { store, actor } = workspace;
  const today = localDate(new Date());
  const mine = Object.values(store.repeatDeliveries).filter((r) => r.memberId === actor.uid);
  const live = mine.filter((r) => r.status === 'ACTIVE' || r.status === 'PAUSED');
  const ordered = new Set(Object.values(store.orders).filter((o) => o.status !== 'CANCELLED').map((o) => o.treatmentId));
  const startable = Object.values(store.approvedTreatments).filter(
    (a) => isApprovalCurrent(a, today) && a.remainingQuantity > 0 && ordered.has(a.treatmentId) && !live.some((r) => r.treatmentId === a.treatmentId),
  );
  const stopped = mine
    .filter((r) => (r.status === 'ENDED' || r.status === 'CANCELLED') && !live.some((l) => l.treatmentId === r.treatmentId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 2);
  const name = (treatmentId: string) => store.treatments[treatmentId]?.name ?? 'Your pen';

  return (
    <Card title="On repeat">
      <p className="small" style={{ marginTop: 0 }}>
        This isn&apos;t a one-time thing. Your next pen arrives before you run out. About {RENEWAL_LEAD_DAYS} days before, we ask how you&apos;re getting on. Answer,
        and it&apos;s on its way from the packs your clinician approved. Pause, skip or stop any time.
      </p>
      {!live.length && !startable.length && !stopped.length && (
        <Empty>Once you&apos;ve ordered your first approved pen, you can put it on repeat here.</Empty>
      )}
      <div className="stack">
        {startable.map((a) => (
          <div key={a.id} className="repeat">
            <div>
              <strong>{name(a.treatmentId)}</strong>
              <div className="small muted">
                {a.remainingQuantity} of {a.approvedQuantity} approved packs left
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => run({ type: 'repeat', action: 'start', treatmentId: a.treatmentId }, `${name(a.treatmentId)} is on repeat`)}
            >
              Put on repeat
            </button>
          </div>
        ))}
        {live.map((r) => (
          <RepeatItem key={r.id} repeat={r} name={name(r.treatmentId)} today={today} />
        ))}
        {stopped.map((r) => (
          <div key={r.id} className="repeat">
            <div>
              <strong>{name(r.treatmentId)}</strong>{' '}
              <Badge>{r.status === 'ENDED' ? 'Finished' : 'Stopped'}</Badge>
              <div className="small muted">
                {r.endedReason === 'LAST_PACK'
                  ? 'That was your last approved pack. Your clinician will review your plan before it runs out.'
                  : 'Repeat is off. You can still order from your account while your approval lasts.'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RepeatItem({ repeat: r, name, today }: { repeat: RepeatDelivery; name: string; today: string }) {
  const { workspace, run, busy } = useWorkspace();
  const [stopping, setStopping] = useState(false);
  const act = (action: 'pause' | 'resume' | 'skip', done: string) => run({ type: 'repeat', action, repeatId: r.id }, done);
  const open = r.status === 'ACTIVE' && !r.holdFollowUpId && today >= r.checkInOpensOn;

  return (
    <div className="repeat stack" data-repeat={r.status.toLowerCase()}>
      <div>
        <strong>{name}</strong> <Badge tone={r.status === 'ACTIVE' ? 'good' : undefined}>{r.status === 'ACTIVE' ? 'On repeat' : 'Paused'}</Badge>
        {r.status === 'ACTIVE' && !open && !r.holdFollowUpId && (
          <div className="small">
            Next pen around <strong>{fmtDate(r.nextShipDate)}</strong>. Your check-in opens on {fmtDate(r.checkInOpensOn)}.
          </div>
        )}
        {r.status === 'PAUSED' && <div className="small muted">Nothing will ship until you resume.</div>}
      </div>

      {r.holdFollowUpId && (
        <Notice tone="info">Your clinician is looking at your last check-in. Your next pen waits until they have.</Notice>
      )}

      {open && (
        <form
          className="stack repeat__checkin"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = formValues(e.currentTarget);
            const flagged = v.checked('sideEffects') || v.checked('needSupport');
            await run(
              {
                type: 'repeat',
                action: 'renew',
                repeatId: r.id,
                mood: Number(v.mood),
                energy: Number(v.energy),
                sideEffects: v.checked('sideEffects'),
                needSupport: v.checked('needSupport'),
                notes: v.notes,
              },
              flagged
                ? 'Check-in saved. Your clinician will look at it before your next pen ships.'
                : workspace.mode === 'demo'
                  ? 'Your next pen is on its way. Demo order, no money charged.'
                  : 'Your next pen is ordered and waiting for payment.',
            );
          }}
        >
          <h3 style={{ margin: 0 }}>Time for a quick check-in</h3>
          <p className="small" style={{ margin: 0 }}>
            How are you getting on with {name}? If anything feels off, tell us and your clinician will look before the next one ships.
          </p>
          <div className="form-grid">
            <label>
              Mood (1–5)
              <input name="mood" type="number" min={1} max={5} defaultValue={3} required />
            </label>
            <label>
              Energy (1–5)
              <input name="energy" type="number" min={1} max={5} defaultValue={3} required />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="sideEffects" /> I have noticed side effects
          </label>
          <label className="check">
            <input type="checkbox" name="needSupport" /> I&apos;d like to talk to my clinician
          </label>
          <label>
            Anything else?
            <textarea name="notes" maxLength={2000} />
          </label>
          <Notice tone="warn">If this is an emergency, call 10177 or go to your nearest emergency unit.</Notice>
          <div>
            <button type="submit" disabled={busy}>
              Check in and send my next pen
            </button>
          </div>
        </form>
      )}

      {!stopping ? (
        <div className="row">
          {r.status === 'ACTIVE' && !open && !r.holdFollowUpId && (
            <button type="button" className="secondary small" disabled={busy} onClick={() => act('skip', 'Next delivery skipped')}>
              Skip next delivery
            </button>
          )}
          {r.status === 'ACTIVE' ? (
            <button type="button" className="secondary small" disabled={busy} onClick={() => act('pause', 'Repeat paused')}>
              Pause
            </button>
          ) : (
            <button type="button" className="small" disabled={busy} onClick={() => act('resume', 'Repeat resumed')}>
              Resume
            </button>
          )}
          <button type="button" className="secondary small" disabled={busy} onClick={() => setStopping(true)}>
            Stop repeat
          </button>
        </div>
      ) : (
        <form
          className="stack repeat__stop"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run({ type: 'repeat', action: 'cancel', repeatId: r.id, reason: formValues(e.currentTarget).reason }, 'Repeat stopped');
            if (ok) setStopping(false);
          }}
        >
          <p className="small" style={{ margin: 0 }}>
            {r.status === 'ACTIVE' ? 'Would a pause help instead? You keep your place and can pick up any time.' : 'Before you go, tell us why.'}
          </p>
          <label>
            Why are you stopping?
            <select name="reason" required defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {STOP_REASONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="row">
            {r.status === 'ACTIVE' && (
              <button type="button" disabled={busy} onClick={() => act('pause', 'Repeat paused').then(() => setStopping(false))}>
                Pause instead
              </button>
            )}
            <button type="submit" className="secondary" disabled={busy}>
              Stop repeat
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setStopping(false)}>
              Keep it
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
