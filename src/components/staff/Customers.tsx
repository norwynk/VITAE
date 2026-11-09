'use client';
import { useState } from 'react';
import { CUSTOMER_STAGES, type CustomerStage, customerStage, journeyStage } from '@/domain/journey';
import type { MemberRecord } from '@/domain/model';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';
import { trail } from './PrickTracker';

const fullName = (m: MemberRecord) => `${m.firstName} ${m.lastName}`.trim();

/** Who the customers are and where each one has got to. Never health answers or clinical decisions. */
export function Customers({ initialStage }: { initialStage: CustomerStage | null }) {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const now = new Date();
  const [stage, setStage] = useState<CustomerStage | null>(initialStage);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = search.trim().toLowerCase();
  const pens = (m: MemberRecord) => m.pensPicked?.map((id) => store.treatments[id]?.name ?? 'A pen no longer listed').join(', ') ?? '';
  const all = Object.values(store.members).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = all.filter(
    (m) => (!stage || customerStage(m) === stage) && (!needle || [fullName(m), m.email, m.phone ?? '', m.city ?? '', m.province ?? '', pens(m)].join(' ').toLowerCase().includes(needle)),
  );
  const count = (s: CustomerStage) => all.filter((m) => customerStage(m) === s).length;

  return (
    <Card title={`Customers (${all.length})`}>
      <div className="stack">
        <label>
          Search by name, email, phone, place or pen
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="tabs">
          <button type="button" aria-pressed={!stage} onClick={() => setStage(null)}>
            Everyone
          </button>
          {CUSTOMER_STAGES.map((s) => (
            <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>
              {s} ({count(s)})
            </button>
          ))}
        </div>
        {!shown.length && <Empty>Nobody here.</Empty>}
        {shown.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Where they are</th>
                  <th>Pens picked</th>
                  <th>From</th>
                  <th>Age</th>
                  <th>Joined</th>
                  <th>Last active</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {shown.flatMap((m) => {
                  const profile = store.operationalProfiles[m.memberId];
                  const journeys = m.penJourneys ?? [];
                  const isOpen = openId === m.id;
                  const row = (
                    <tr key={m.id}>
                      <td>
                        {journeys.length ? (
                          <button type="button" className="link-button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : m.id)}>
                            {fullName(m) || m.email}
                          </button>
                        ) : (
                          fullName(m) || m.email
                        )}{' '}
                        {profile?.consentWithdrawn && <Badge tone="alert">Consent withdrawn</Badge>}
                      </td>
                      <td>{customerStage(m)}</td>
                      <td>{pens(m) || <span className="muted">None yet</span>}</td>
                      <td>{[m.city, m.province].filter(Boolean).join(', ') || <span className="muted">Not given</span>}</td>
                      <td>{m.age ?? <span className="muted">—</span>}</td>
                      <td>{fmtDateTime(m.createdAt)}</td>
                      <td>{profile?.lastActivityAt ? fmtDateTime(profile.lastActivityAt) : <span className="muted">—</span>}</td>
                      <td className="small">
                        {m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}
                        {m.phone && (
                          <>
                            <br />
                            <a href={`tel:${m.phone.replace(/\s/g, '')}`}>{m.phone}</a>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                  if (!isOpen) return [row];
                  return [
                    row,
                    <tr key={`${m.id}-detail`}>
                      <td colSpan={8}>
                        <ul className="plain small">
                          {journeys.map((j) => (
                            <li key={j.requestId}>
                              <strong>{store.treatments[j.treatmentId]?.name ?? 'A pen no longer listed'}</strong>: {journeyStage(j, now).label}
                              <br />
                              <span className="muted">{trail(j)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
