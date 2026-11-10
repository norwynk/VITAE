'use client';
import { useState } from 'react';
import type { PrickListEntry } from '@/domain/model';
import { LIST_SOURCES, SOURCE_LABEL, listSource } from '@/domain/prickList';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

const WEEK = 7 * 86_400_000;

/** A spreadsheet of everyone still on the list, for messaging them. */
function download(entries: PrickListEntry[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [['Name', 'Email or number', 'Type', 'Came from', 'Joined'], ...entries.map((e) => [e.name, e.contact, e.kind === 'EMAIL' ? 'Email' : 'WhatsApp', SOURCE_LABEL[listSource(e.source)], e.createdAt.slice(0, 10)])];
  const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `the-prick-list-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Who joined The Prick List, and from where. Anyone who asks to leave is taken off here. */
export function PrickList() {
  const { workspace, run, busy } = useWorkspace();
  const all = Object.values(workspace.store.prickList).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const on = all.filter((e) => e.status === 'IN');
  const [weekAgo] = useState(() => new Date(Date.now() - WEEK).toISOString());
  const bySource = LIST_SOURCES.map((s) => ({ s, total: on.filter((e) => listSource(e.source) === s).length, week: on.filter((e) => listSource(e.source) === s && e.createdAt >= weekAgo).length })).filter((r) => r.total);

  return (
    <div className="stack">
      <Card title={`The Prick List (${on.length})`}>
        <p className="muted small" style={{ marginTop: 0 }}>
          People who asked to hear from PRICK. Everyone ticked permission to be emailed or WhatsApped, and every message must tell them how to
          leave.
        </p>
        {!on.length && <Empty>Nobody yet. Your social bios link to /the-prick-list?from=instagram and so on.</Empty>}
        {bySource.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Came from</th>
                  <th>On the list</th>
                  <th>Last 7 days</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((r) => (
                  <tr key={r.s}>
                    <td>{SOURCE_LABEL[r.s]}</td>
                    <td>{r.total}</td>
                    <td>{r.week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {on.length > 0 && (
          <div>
            <button type="button" className="secondary" onClick={() => download(on)}>
              Download as a spreadsheet
            </button>
          </div>
        )}
      </Card>
      {on.length > 0 && (
        <Card title="Everyone on the list">
          <ul className="plain stack small">
            {on.map((e) => (
              <li key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ flex: 1, minWidth: '14rem' }}>
                  <strong>{e.name}</strong> <Badge>{SOURCE_LABEL[listSource(e.source)]}</Badge>
                  <br />
                  {e.kind === 'EMAIL' ? <a href={`mailto:${e.contact}`}>{e.contact}</a> : <a href={`https://wa.me/${e.contact.replace(/\D/g, '').replace(/^0/, '27')}`}>{e.contact}</a>}{' '}
                  <span className="muted">· joined {fmtDateTime(e.createdAt)}</span>
                </span>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Take ${e.name} off The Prick List? They won't be messaged again unless they sign up again.`)) void run({ type: 'prickListLeave', entryId: e.id }, `${e.name} is off the list`);
                  }}
                >
                  Asked to leave
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
