'use client';
import { hhNurseVisitPrice } from '@/domain/intake';
import type { HormoneBloodsStatus, OperationalProfile } from '@/domain/model';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

const STATUS: Record<HormoneBloodsStatus, string> = { TO_ARRANGE: 'To arrange', BOOKED: 'Nurse booked', RESULTS_IN: 'Results in' };

/**
 * The Blood Bank: Happy Hormones members, whose hormones can't be prescribed
 * until their bloods are in. Shows how they chose to do them and where that's
 * got to. Logistics only: the results themselves stay with the doctor.
 */
export function BloodBank() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const all = Object.values(store.operationalProfiles)
    .filter((p): p is OperationalProfile & { hormoneBloods: NonNullable<OperationalProfile['hormoneBloods']> } => Boolean(p.hormoneBloods))
    .sort((a, b) => b.hormoneBloods.askedAt.localeCompare(a.hormoneBloods.askedAt));
  const open = all.filter((p) => p.hormoneBloods.status !== 'RESULTS_IN');
  const done = all.filter((p) => p.hormoneBloods.status === 'RESULTS_IN');
  const nameOf = (p: OperationalProfile) => {
    const m = store.members[p.memberId];
    return (m && `${m.firstName} ${m.lastName}`.trim()) || p.displayName;
  };
  const set = (p: OperationalProfile, status: HormoneBloodsStatus) =>
    void run({ type: 'hormoneBloods', memberId: p.memberId, status }, `${nameOf(p)}: ${STATUS[status].toLowerCase()}`);

  const row = (p: (typeof all)[number]) => {
    const b = p.hormoneBloods;
    const phone = store.members[p.memberId]?.phone;
    return (
      <li key={p.memberId} className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ flex: 1, minWidth: '14rem' }}>
          <strong>{nameOf(p)}</strong> <Badge tone={b.status === 'TO_ARRANGE' ? 'alert' : b.status === 'RESULTS_IN' ? 'good' : undefined}>{STATUS[b.status]}</Badge>
          <br />
          {b.route === 'NURSE_VISIT' ? `Wants a nurse to come to them (${hhNurseVisitPrice()})` : 'Sending their own results'}
          {phone && (
            <>
              {' · '}
              <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>
            </>
          )}
          {p.province && ` · ${p.province}`}
          <br />
          <span className="muted">
            Asked {fmtDateTime(b.askedAt)}
            {b.updatedAt !== b.askedAt && `, updated ${fmtDateTime(b.updatedAt)}`}
          </span>
        </span>
        <span className="row">
          {b.route === 'NURSE_VISIT' && b.status === 'TO_ARRANGE' && (
            <button type="button" disabled={busy} onClick={() => set(p, 'BOOKED')}>
              Nurse booked
            </button>
          )}
          {b.status !== 'RESULTS_IN' && (
            <button type="button" className={b.route === 'NURSE_VISIT' && b.status === 'TO_ARRANGE' ? 'secondary' : undefined} disabled={busy} onClick={() => set(p, 'RESULTS_IN')}>
              Results in
            </button>
          )}
          {b.status !== 'TO_ARRANGE' && (
            <button type="button" className="secondary" disabled={busy} onClick={() => set(p, 'TO_ARRANGE')}>
              Back to arrange
            </button>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="stack">
      <Card title={`The Blood Bank (${open.length})`}>
        <p className="muted small">
          Happy Hormones needs bloods before a doctor can prescribe. Peptides don&apos;t. Book the nurse or chase the results, then mark them in so the doctor can decide.
        </p>
        {!open.length && <Empty>No bloods waiting.</Empty>}
        <ul className="plain stack small">{open.map(row)}</ul>
      </Card>
      {done.length > 0 && (
        <Card title="Results in">
          <ul className="plain stack small">{done.map(row)}</ul>
        </Card>
      )}
    </div>
  );
}
