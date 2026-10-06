'use client';
import { localDate } from '@/domain/model';
import { Thread } from '../member/MemberHome';
import { Badge, Card, Empty, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';
import { OrderTable } from './OrderTable';
import { StockTable } from './StockTable';

export function OperationsHome() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const profiles = Object.values(store.operationalProfiles).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  const threads = Object.values(store.messageThreads).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const followUps = Object.values(store.followUps).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const name = (memberId: string) => store.operationalProfiles[memberId]?.displayName ?? 'Member';

  return (
    <div className="stack">
      <h1>Operations</h1>
      <p className="muted">Workflow and order information only. Medical histories and clinical notes are not shown here.</p>
      <Card title="Members">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Onboarding</th>
                <th>Province</th>
                <th>Open requests</th>
                <th>Address</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.displayName} {p.consentWithdrawn && <Badge tone="alert">Consent withdrawn</Badge>}
                  </td>
                  <td>{humanise(p.onboardingStatus)}</td>
                  <td>{p.province ?? '—'}</td>
                  <td>{p.openRequestCount}</td>
                  <td>{p.hasDeliveryAddress ? 'Saved' : '—'}</td>
                  <td>{fmtDateTime(p.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Orders">
        <OrderTable orders={Object.values(store.orders)} />
      </Card>
      <div className="grid">
        <Card title="General and delivery messages">
          {!threads.length && <Empty>No messages.</Empty>}
          <div className="stack">
            {threads.map((t) => (
              <div key={t.id}>
                <div className="small muted">{name(t.memberId)}</div>
                <Thread threadId={t.id} store={store} busy={busy} onReply={(body) => run({ type: 'message', threadId: t.id, memberId: t.memberId, body }, 'Reply sent')} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Follow-ups">
          <ul className="plain small">
            {followUps.map((f) => (
              <li key={f.id}>
                {f.dueDate} · {name(f.memberId)} · {f.reason} <Badge>{humanise(f.status)}</Badge>
              </li>
            ))}
          </ul>
          <form
            className="stack"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              const v = formValues(e.currentTarget);
              void run({ type: 'followup', action: 'schedule', memberId: v.memberId, dueDate: v.dueDate, reason: v.reason }, 'Follow-up scheduled');
            }}
          >
            <div className="form-grid">
              <label>
                Member
                <select name="memberId" required>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.memberId}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input name="dueDate" type="date" min={localDate(new Date())} required />
              </label>
            </div>
            <label>
              Reason
              <input name="reason" required />
            </label>
            <div>
              <button type="submit" disabled={busy}>
                Schedule follow-up
              </button>
            </div>
          </form>
        </Card>
      </div>
      <Card title="Stock">
        <StockTable />
      </Card>
    </div>
  );
}
