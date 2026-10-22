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
  const sent = all.filter((r) => r.status === 'SENT').slice(0, 20);
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
      {sent.length > 0 && (
        <details style={{ marginTop: 'var(--space-3)' }}>
          <summary className="small">Recently sent ({sent.length})</summary>
          <ul className="plain small">
            {sent.map((r) => (
              <li key={r.id}>
                {r.treatmentName} for {r.memberName}, sent {r.sentAt ? fmtDateTime(r.sentAt) : ''}
                {r.courierReference ? ` · ${r.courierReference}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
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
            { type: 'releaseSent', memberId: r.memberId, releaseId: r.id, ...(courier.trim() ? { courierReference: courier.trim() } : {}) },
            `${r.treatmentName} marked as sent. ${r.memberName.split(' ')[0]} has been told it's on its way.`,
          );
        }}
      >
        <label style={{ flex: 1 }}>
          Courier reference (optional)
          <input value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={80} />
        </label>
        <button type="submit" disabled={busy}>
          Mark as sent
        </button>
      </form>
    </article>
  );
}

/** What happened, without what anyone said: screenings sent, pens sent. */
export function TeamActivity() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const name = (memberId?: string) => (memberId && store.operationalProfiles[memberId]?.displayName) || 'A member';
  const rows = Object.values(store.auditEvents)
    .filter((e) => e.action === 'onboard' || e.action === 'releaseSent')
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
  const approvals = Object.values(store.penReleases).map((r) => ({ at: r.approvedAt, text: `${r.approvedByName} approved ${r.treatmentName} for ${r.memberName}` }));
  const feed = [
    ...rows.map((e) => ({
      at: e.at,
      text: e.action === 'onboard' ? `${name(e.memberId)} sent a screening to the clinician` : `Pen sent to ${name(e.memberId)}`,
    })),
    ...approvals,
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
