'use client';
import { Card, Empty } from '../ui';
import { useWorkspace } from '../workspace-context';

export function CorporateHome() {
  const { workspace } = useWorkspace();
  const accounts = Object.values(workspace.store.corporateAccounts);
  return (
    <div className="stack">
      <h1>Corporate account</h1>
      <p className="muted">Aggregate enrolment only. Corporate users never see identifiable health or order data.</p>
      <Card title="Accounts">
        {!accounts.length && <Empty>No accounts linked to you.</Empty>}
        <ul className="plain">
          {accounts.map((a) => (
            <li key={a.id}>
              <strong>{a.name}</strong>: {a.enrolledMembers} enrolled member{a.enrolledMembers === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
