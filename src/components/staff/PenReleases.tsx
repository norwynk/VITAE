'use client';
import { useState } from 'react';
import type { PenRelease } from '@/domain/model';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

/**
 * Pens a clinician has approved, ready to go out. Dispatch details only:
 * screening answers and clinical notes are never part of this.
 */
export function PenReleases() {
  const { workspace } = useWorkspace();
  const all = Object.values(workspace.store.penReleases).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  const toSend = all.filter((r) => r.status === 'TO_SEND');
  const toConfirm = all.filter((r) => r.status === 'SENT' && !r.deliveredAt).sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''));
  const sent = all.filter((r) => r.status === 'SENT' && r.deliveredAt).slice(0, 20);
  return (
    <Card title={`Pens to send${toSend.length ? ` (${toSend.length})` : ''}`}>
      <p className="muted small" style={{ marginTop: 0 }}>
        Appears here the moment the clinician approves a pen. Dispatch details only: you never see screening answers.
      </p>
      {!toSend.length && <Empty>Nothing waiting. Approved pens show up here.</Empty>}
      <div className="stack">
        {toSend.map((r) => (
          <ReleaseRow key={r.id} release={r} />
        ))}
      </div>
      {toConfirm.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <strong>Sent, delivery to confirm ({toConfirm.length})</strong>
          <p className="muted small" style={{ margin: '0.25rem 0 0.5rem' }}>
            Check each one on the courier&apos;s tracking once a day. It clears by itself if the member taps &quot;I&apos;ve got my pen&quot;.
          </p>
          <ul className="plain small stack" style={{ gap: '0.5rem' }}>
            {toConfirm.map((r) => (
              <DeliveryRow key={r.id} release={r} />
            ))}
          </ul>
        </div>
      )}
      {sent.length > 0 && (
        <details style={{ marginTop: 'var(--space-3)' }}>
          <summary className="small">Recently delivered ({sent.length})</summary>
          <ul className="plain small">
            {sent.map((r) => (
              <li key={r.id}>
                {r.treatmentName} for {r.memberName}, delivered {r.deliveredAt ? fmtDateTime(r.deliveredAt) : ''}
                {r.courierReference ? ` · ${r.courierReference}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function DeliveryRow({ release: r }: { release: PenRelease }) {
  const { run, busy } = useWorkspace();
  return (
    <li className="row">
      <span style={{ flex: 1, minWidth: '12rem' }}>
        {r.treatmentName} for {r.memberName}, sent {r.sentAt ? fmtDateTime(r.sentAt) : ''}
        {r.courierReference ? ` · ${r.courierReference}` : ''}
      </span>
      <button type="button" className="secondary" disabled={busy} onClick={() => void run({ type: 'releaseDelivered', memberId: r.memberId, releaseId: r.id }, `${r.treatmentName} marked as delivered`)}>
        Delivered
      </button>
    </li>
  );
}

function ReleaseRow({ release: r }: { release: PenRelease }) {
  const { run, busy } = useWorkspace();
  const [courier, setCourier] = useState('');
  const a = r.deliveryAddress;
  return (
    <article className="release" aria-label={`Release ${r.treatmentName} for ${r.memberName}`}>
      <div className="release__head">
        <strong>
          {r.treatmentName} × {r.quantity}
        </strong>
        <Badge tone="good">Approved by {r.approvedByName}</Badge>
      </div>
      <dl className="release__facts">
        <dt>For</dt>
        <dd>
          {r.memberName}
          {r.phone ? ` · ${r.phone}` : ''}
          {r.email ? ` · ${r.email}` : ''}
        </dd>
        <dt>Dose on the label</dt>
        <dd>{r.dose}</dd>
        {r.instructions && (
          <>
            <dt>Instructions</dt>
            <dd>{r.instructions}</dd>
          </>
        )}
        <dt>Starts</dt>
        <dd>{r.startDate}</dd>
        <dt>Deliver to</dt>
        <dd>
          {a
            ? `${a.recipient}, ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.suburb}, ${a.city}, ${a.province}, ${a.postalCode} · ${a.phone}`
            : 'No address saved yet. Contact them to arrange delivery.'}
        </dd>
        <dt>Approved</dt>
        <dd>{fmtDateTime(r.approvedAt)}</dd>
      </dl>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            { type: 'releaseSent', memberId: r.memberId, releaseId: r.id, courierReference: courier.trim() },
            `${r.treatmentName} marked as sent. ${r.memberName.split(' ')[0]} has been told it's on its way.`,
          );
        }}
      >
        <label style={{ flex: 1 }}>
          Courier reference
          <input value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={80} required pattern=".*\S.*" />
        </label>
        <button type="submit" disabled={busy}>
          Mark as sent
        </button>
      </form>
    </article>
  );
}

const ACTIVITY: Record<string, (who: string) => string> = {
  onboard: (who) => `${who} sent a screening to the clinician`,
  request: (who) => `${who} asked for a pen`,
  logCall: (who) => `The doctor logged a call with ${who}`,
  releaseSent: (who) => `Pen sent to ${who}`,
  releaseDelivered: (who) => `Pen delivered to ${who}`,
  penReceived: (who) => `${who} confirmed they have their pen`,
  summonsStatus: () => 'The team moved a Royal Summons on',
  hormoneBloods: (who) => `The team moved ${who}'s Happy Hormones bloods on`,
};

/** What happened, without what anyone said. */
export function TeamActivity() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const name = (memberId?: string) => (memberId && store.operationalProfiles[memberId]?.displayName) || 'A member';
  const rows = Object.values(store.auditEvents)
    .filter((e) => e.action in ACTIVITY)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
  const approvals = Object.values(store.penReleases).map((r) => ({ at: r.approvedAt, text: `${r.approvedByName} approved ${r.treatmentName} for ${r.memberName}` }));
  const feed = [
    ...rows.map((e) => ({
      at: e.at,
      text: ACTIVITY[e.action](name(e.memberId)),
    })),
    ...approvals,
    ...Object.values(store.royalSummons).map((s) => ({ at: s.createdAt, text: `${s.name} summoned the Royal Prick` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
  return (
    <Card title="Activity">
      {!feed.length && <Empty>Nothing yet.</Empty>}
      <ul className="plain stack small">
        {feed.map((f, i) => (
          <li key={`${f.at}-${i}`}>
            <span className="muted">{fmtDateTime(f.at)}</span> · {f.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}
