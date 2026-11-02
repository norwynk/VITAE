'use client';
import { type Payment, formatRand, localDate } from '@/domain/model';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

const STATUS: Record<Payment['status'], { label: string; tone?: 'good' | 'alert' }> = {
  AWAITING_PROVIDER: { label: 'Waiting for payment' },
  PAID: { label: 'Paid', tone: 'good' },
  SIMULATED_PAID: { label: 'Demo (no money)' },
  REFUNDED: { label: 'Refunded', tone: 'alert' },
  VOID: { label: 'Cancelled' },
};

/**
 * Every payment, matched to Paystack by its reference. Paystack's dashboard
 * holds the money itself (payouts, fees, refunds); this is the PRICK side,
 * so any order can be found in both in seconds.
 */
export function Payments() {
  const { workspace } = useWorkspace();
  const payments = Object.values(workspace.store.payments).sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt));
  const month = localDate(new Date()).slice(0, 7);
  const paid = payments.filter((p) => p.status === 'PAID');
  const real = paid.filter((p) => !p.testMode);
  const thisMonth = real.filter((p) => p.paidAt && localDate(new Date(p.paidAt)).startsWith(month));
  const sum = (ps: Payment[]) => ps.reduce((t, p) => t + p.amountCents, 0);
  const waiting = payments.filter((p) => p.status === 'AWAITING_PROVIDER');
  const tests = paid.filter((p) => p.testMode);

  return (
    <Card title="Payments">
      <dl className="release__facts">
        <dt>Paid this month</dt>
        <dd>
          <strong>{formatRand(sum(thisMonth))}</strong> from {thisMonth.length} payment{thisMonth.length === 1 ? '' : 's'}
        </dd>
        <dt>Waiting for payment</dt>
        <dd>
          {formatRand(sum(waiting))} across {waiting.length} approved pen{waiting.length === 1 ? '' : 's'}
        </dd>
        {tests.length > 0 && (
          <>
            <dt>Test payments</dt>
            <dd>
              {formatRand(sum(tests))} from {tests.length}, not counted above: no real money moved
            </dd>
          </>
        )}
      </dl>
      {!payments.length && <Empty>No payments yet. They appear here when a clinician approves a pen that has a price.</Empty>}
      {payments.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Who</th>
                  <th>For</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paystack reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 100).map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDateTime(p.paidAt ?? p.createdAt)}</td>
                    <td>{p.memberName ?? '—'}</td>
                    <td>{p.description ?? '—'}</td>
                    <td>{formatRand(p.amountCents)}</td>
                    <td>
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                      {p.testMode && <Badge>Test</Badge>}
                      {p.channel && <span className="small muted"> {p.channel.replace(/_/g, ' ')}</span>}
                    </td>
                    <td className="small">{p.status === 'PAID' || p.status === 'REFUNDED' ? p.reference : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="row" style={{ marginTop: 'var(--space-2)' }}>
            <button type="button" className="secondary" onClick={() => downloadCsv(payments)}>
              Download for your accountant (CSV)
            </button>
            <span className="small muted">Refunds are done in the Paystack dashboard; they update here by themselves.</span>
          </p>
        </>
      )}
    </Card>
  );
}

function downloadCsv(payments: Payment[]) {
  const cell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Date', 'Who', 'For', 'Amount (ZAR)', 'Status', 'Test', 'Method', 'Paystack reference', 'PRICK payment id'],
    ...payments.map((p) => [
      p.paidAt ?? p.createdAt,
      p.memberName,
      p.description,
      (p.amountCents / 100).toFixed(2),
      STATUS[p.status].label,
      p.testMode ? 'yes' : '',
      p.channel,
      p.reference,
      p.id,
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prick-payments-${localDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
