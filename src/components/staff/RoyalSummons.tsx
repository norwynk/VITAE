'use client';
import type { RoyalSummons as Summons, SummonsStatus } from '@/domain/model';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

const LABEL: Record<SummonsStatus, string> = { NEW: 'To phone', PHONED: 'Phoned', BOOKED: 'Booked', NOT_GOING_AHEAD: 'Not going ahead' };
const isOpen = (s: Summons) => s.status === 'NEW' || s.status === 'PHONED';

/** People who asked for the Royal Prick. Until booking and payment exist, this is the list to phone. */
export function RoyalSummons() {
  const { workspace, run, busy } = useWorkspace();
  const all = Object.values(workspace.store.royalSummons).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = all.filter(isOpen);
  const closed = all.filter((s) => !isOpen(s));
  const set = (s: Summons, status: Exclude<SummonsStatus, 'NEW'>) => void run({ type: 'summonsStatus', summonsId: s.id, status }, `${s.name}: ${LABEL[status].toLowerCase()}`);

  return (
    <div className="stack">
      <Card title={`The Royal Summons (${open.length})`}>
        {!open.length && <Empty>Nobody waiting.</Empty>}
        <ul className="plain stack small">
          {open.map((s) => (
            <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ flex: 1, minWidth: '14rem' }}>
                <strong>{s.name}</strong> <Badge tone={s.status === 'NEW' ? 'alert' : undefined}>{LABEL[s.status]}</Badge>
                <br />
                <a href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}>{s.phone}</a> · {s.area}
                <br />
                <span className="muted">
                  Asked {fmtDateTime(s.createdAt)}
                  {s.phonedAt && `, phoned ${fmtDateTime(s.phonedAt)}`}
                </span>
              </span>
              <span className="row">
                {s.status === 'NEW' && (
                  <button type="button" disabled={busy} onClick={() => set(s, 'PHONED')}>
                    Phoned them
                  </button>
                )}
                <button type="button" className="secondary" disabled={busy} onClick={() => set(s, 'BOOKED')}>
                  Booked
                </button>
                <button type="button" className="secondary" disabled={busy} onClick={() => set(s, 'NOT_GOING_AHEAD')}>
                  Not going ahead
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      {closed.length > 0 && (
        <Card title="Finished">
          <ul className="plain stack small">
            {closed.map((s) => (
              <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ flex: 1, minWidth: '14rem' }}>
                  <strong>{s.name}</strong> <Badge tone={s.status === 'BOOKED' ? 'good' : undefined}>{LABEL[s.status]}</Badge> <span className="muted">{s.area}, {fmtDateTime(s.updatedAt)}</span>
                </span>
                <button type="button" className="secondary" disabled={busy} onClick={() => set(s, 'PHONED')}>
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
