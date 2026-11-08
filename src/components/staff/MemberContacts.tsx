'use client';
import { OVERDUE_HOURS, waitedLabel, workingHours } from '@/domain/waiting';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

/** The admin's view of who is waiting and how to reach everyone. Contact details only, never health answers. */
export function MemberContacts() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const now = new Date();
  const waiting = Object.values(store.operationalProfiles)
    .filter((p) => p.waitingSince)
    .sort((a, b) => a.waitingSince!.localeCompare(b.waitingSince!));
  const members = Object.values(store.members).sort((a, b) => (b.onboardedAt ?? b.createdAt).localeCompare(a.onboardedAt ?? a.createdAt));
  const contact = (memberId: string) => store.members[memberId];

  return (
    <>
      <Card title="Waiting on the clinician">
        {!waiting.length && <Empty>Nobody is waiting.</Empty>}
        <ul className="plain small stack" style={{ gap: '0.5rem' }}>
          {waiting.map((p) => {
            const hours = workingHours(p.waitingSince!, now);
            const c = contact(p.memberId);
            return (
              <li key={p.id}>
                <strong>{c ? `${c.firstName} ${c.lastName}`.trim() || c.email : p.displayName}</strong>: waiting {waitedLabel(hours)}{' '}
                {hours >= OVERDUE_HOURS && <Badge tone="alert">Overdue</Badge>}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="Members and contact details">
        {!members.length && <Empty>No members yet.</Empty>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Assessment sent</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{`${m.firstName} ${m.lastName}`.trim() || <span className="muted">Not given yet</span>}</td>
                  <td>{m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}</td>
                  <td>{m.phone ? <a href={`tel:${m.phone.replace(/\s/g, '')}`}>{m.phone}</a> : <span className="muted">Not given yet</span>}</td>
                  <td>{m.onboardedAt ? fmtDateTime(m.onboardedAt) : <span className="muted">Not finished</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
