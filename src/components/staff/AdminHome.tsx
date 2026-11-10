'use client';
import { useEffect, useState } from 'react';
import { isNontrivialReference } from '@/domain/commands';
import { CUSTOMER_STAGES, type CustomerStage } from '@/domain/journey';
import { type Treatment, REGULATORY_STATUSES, formatRand } from '@/domain/model';
import { morningBrief } from '@/domain/morning';
import { waitingOnTeam } from '@/domain/waiting';
import { Thread } from '../member/MemberHome';
import { Badge, Card, Empty, Notice, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';
import { type AdminTab, AdminToday } from './AdminToday';
import { Customers } from './Customers';
import { EmailCheck } from './EmailCheck';
import { OrderTable } from './OrderTable';
import { PenReleases } from './PenReleases';
import { PrickTracker, WaitingOnDoctor } from './PrickTracker';
import { RoyalSummons } from './RoyalSummons';
import { PrickList } from './PrickList';
import { StockTable } from './StockTable';

const TABS: AdminTab[] = ['Today', 'Customers', 'Pens', 'Royal Summons', 'The Prick List', 'Messages', 'Stock and catalogue', 'Behind the scenes'];

interface AdminView {
  tab: AdminTab;
  stage: CustomerStage | null;
  person: string | null;
}

const isToday = (v: AdminView) => v.tab === 'Today' && !v.stage && !v.person;

/** Where the admin is, from the address bar. Which customer is open stays out of the address, in the browser's history. */
function currentView(): AdminView {
  const query = new URLSearchParams(window.location.search);
  return {
    tab: TABS.find((t) => t === query.get('view')) ?? 'Today',
    stage: CUSTOMER_STAGES.find((s) => s === query.get('stage')) ?? null,
    person: (window.history.state?.adminPerson as string | undefined) ?? null,
  };
}

export function AdminHome() {
  const { workspace } = useWorkspace();
  const [view, setView] = useState<AdminView>(currentView);
  const { tab, stage, person } = view;

  // The browser's own Back and Forward buttons.
  useEffect(() => {
    const sync = () => setView(currentView());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const navigate = (next: AdminView) => {
    if (next.tab === tab && next.stage === stage && next.person === person) return;
    const query = new URLSearchParams();
    if (next.tab !== 'Today') query.set('view', next.tab);
    if (next.stage) query.set('stage', next.stage);
    const depth = ((window.history.state?.adminDepth as number | undefined) ?? 0) + 1;
    window.history.pushState({ adminPerson: next.person, adminDepth: depth }, '', query.toString() ? `?${query}` : window.location.pathname);
    setView(next);
    if (next.tab !== tab) window.scrollTo(0, 0);
  };
  const go = (next: AdminTab, nextStage: CustomerStage | null = null) => navigate({ tab: next, stage: nextStage, person: null });
  // Opened straight on a page (a refresh or a link) there is nothing behind it, so Back goes to Today.
  const back = () => (window.history.state?.adminDepth ? window.history.back() : go('Today'));

  return (
    <div className="stack">
      {!isToday(view) && (
        <button type="button" className="secondary admin-back" onClick={back}>
          ← Back
        </button>
      )}
      <h1>The Morning Prick</h1>
      <div className="member-tabs" role="tablist" aria-label="Administration">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-current' : ''} onClick={() => go(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Today' && <AdminToday brief={morningBrief(workspace.store, new Date())} onGo={go} />}
      {tab === 'Customers' && <Customers stage={stage} person={person} onStage={(s) => go('Customers', s)} onPerson={(id) => navigate({ tab, stage, person: id })} />}
      {tab === 'Pens' && <Pens />}
      {tab === 'Royal Summons' && <RoyalSummons />}
      {tab === 'The Prick List' && <PrickList />}
      {tab === 'Messages' && <Messages />}
      {tab === 'Stock and catalogue' && <StockAndCatalogue />}
      {tab === 'Behind the scenes' && <BehindTheScenes />}
    </div>
  );
}

function Pens() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const repeats = Object.values(store.repeatDeliveries)
    .filter((r) => r.status === 'ACTIVE' || r.status === 'PAUSED')
    .sort((a, b) => a.nextShipDate.localeCompare(b.nextShipDate));
  const orders = Object.values(store.orders);
  const name = (memberId: string) => store.operationalProfiles[memberId]?.displayName ?? 'A member';
  return (
    <div className="stack">
      <PenReleases />
      <PrickTracker />
      <WaitingOnDoctor />
      <Card title="Repeat pens">
        {!repeats.length && <Empty>Nobody is on repeat yet.</Empty>}
        <ul className="plain small">
          {repeats.map((r) => (
            <li key={r.id}>
              <strong>{name(r.memberId)}</strong>: {store.treatments[r.treatmentId]?.name ?? 'A pen no longer listed'}, next pen {r.nextShipDate} <Badge>{humanise(r.status)}</Badge> {r.holdFollowUpId && <Badge tone="alert">Held for the doctor</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      {orders.length > 0 && (
        <Card title="Orders">
          <OrderTable orders={orders} />
        </Card>
      )}
    </div>
  );
}

function Messages() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const waiting = new Set(waitingOnTeam(store).map((i) => i.key));
  const threads = Object.values(store.messageThreads).sort(
    (a, b) => Number(waiting.has(`msg_${b.id}`)) - Number(waiting.has(`msg_${a.id}`)) || b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
  const name = (memberId: string) => store.operationalProfiles[memberId]?.displayName ?? 'A member';
  return (
    <Card title="General and delivery messages">
      <p className="muted small" style={{ marginTop: 0 }}>
        Clinical messages and side-effect concerns stay with the doctor and aren&apos;t shown here. Your replies appear to the member as &quot;PRICK team&quot;.
      </p>
      {!threads.length && <Empty>No messages.</Empty>}
      <div className="stack">
        {threads.map((t) => (
          <div key={t.id}>
            <div className="small muted">
              {name(t.memberId)} {waiting.has(`msg_${t.id}`) && <Badge tone="alert">Needs a reply</Badge>}
            </div>
            <Thread threadId={t.id} store={store} busy={busy} onReply={(body) => run({ type: 'message', threadId: t.id, memberId: t.memberId, body }, 'Reply sent')} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function StockAndCatalogue() {
  const { workspace, run, busy } = useWorkspace();
  const treatments = Object.values(workspace.store.treatments).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="stack">
      <Notice tone="warn">
        Only mark a treatment verified with a real registration reference you have checked. Purchasable requires
        verification, and the server enforces it.
      </Notice>
      <Card title="Catalogue">
        <div className="stack">
          {treatments.map((t) => (
            <TreatmentEditor key={`${t.id}-${t.updatedAt}`} treatment={t} />
          ))}
        </div>
      </Card>
      <Card title="Create pathway">
        <p className="muted small">New pathways start inactive, hidden, unverified and not purchasable, with zero stock.</p>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const v = formValues(form);
            const ok = await run(
              { type: 'catalogueCreate', slug: v.slug, name: v.name, summary: v.summary, category: v.category, inventorySku: v.sku },
              'Pathway created (private and inactive)',
            );
            if (ok) form.reset();
          }}
        >
          <div className="form-grid">
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9-]{3,60}" required />
            </label>
            <label>
              Category
              <input name="category" required />
            </label>
            <label>
              Inventory SKU
              <input name="sku" pattern="[A-Z0-9-]{3,40}" required />
            </label>
          </div>
          <label>
            Summary
            <textarea name="summary" required />
          </label>
          <div>
            <button type="submit" disabled={busy}>
              Create pathway
            </button>
          </div>
        </form>
      </Card>
      <Card title="Stock">
        <StockTable />
      </Card>
    </div>
  );
}

function BehindTheScenes() {
  const { workspace } = useWorkspace();
  const audit = Object.values(workspace.store.auditEvents)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 100);
  return (
    <div className="stack">
      <EmailCheck />
      <Card title="Audit log (latest 100)">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDateTime(a.at)}</td>
                  <td>
                    {humanise(a.actorRole)} <span className="muted small">{a.actorId}</span>
                  </td>
                  <td>{a.action}</td>
                  <td className="small muted">{a.targets.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TreatmentEditor({ treatment: t }: { treatment: Treatment }) {
  const { run, busy } = useWorkspace();
  return (
    <form
      className="card stack"
      aria-label={`Edit ${t.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        const v = formValues(e.currentTarget);
        void run(
          {
            type: 'catalogue',
            treatmentId: t.id,
            changes: {
              name: v.name,
              summary: v.summary,
              active: v.checked('active'),
              public: v.checked('public'),
              purchasable: v.checked('purchasable'),
              regulatoryStatus: v.regulatoryStatus as Treatment['regulatoryStatus'],
              regulatoryReference: v.regulatoryReference,
              priceCents: Math.round(Number(v.price) * 100),
            },
          },
          `${v.name} updated`,
        );
      }}
    >
      <div className="row">
        <strong>{t.name}</strong>
        <Badge tone={t.active ? 'good' : undefined}>{t.active ? 'Active' : 'Inactive'}</Badge>
        <Badge>{t.public ? 'Public' : 'Hidden'}</Badge>
        <Badge tone={t.regulatoryStatus === 'VERIFIED' ? 'good' : 'alert'}>{humanise(t.regulatoryStatus)}</Badge>
        <Badge tone={t.purchasable ? 'good' : undefined}>{t.purchasable ? 'Purchasable' : 'Not purchasable'}</Badge>
        {t.demoFictional && <Badge tone="alert">Fictional</Badge>}
        <span className="muted small">{formatRand(t.priceCents)}</span>
      </div>
      <div className="form-grid">
        <label>
          Name
          <input name="name" defaultValue={t.name} required />
        </label>
        <label>
          Price (ZAR)
          <input name="price" type="number" min={0} step="0.01" defaultValue={(t.priceCents / 100).toFixed(2)} required />
        </label>
        <label>
          Regulatory status
          <select name="regulatoryStatus" defaultValue={t.regulatoryStatus}>
            {REGULATORY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Registration reference
          <input name="regulatoryReference" defaultValue={t.regulatoryReference} />
        </label>
      </div>
      <label>
        Summary
        <textarea name="summary" defaultValue={t.summary} required />
      </label>
      <div className="row">
        <label className="check">
          <input type="checkbox" name="active" defaultChecked={t.active} /> Active
        </label>
        <label className="check">
          <input type="checkbox" name="public" defaultChecked={t.public} /> Public
        </label>
        <label className="check">
          <input type="checkbox" name="purchasable" defaultChecked={t.purchasable} /> Purchasable
        </label>
      </div>
      {t.regulatoryStatus === 'VERIFIED' && !isNontrivialReference(t.regulatoryReference) && (
        <Notice tone="warn">Verified without a usable reference: this cannot be made purchasable.</Notice>
      )}
      <div>
        <button type="submit" disabled={busy}>
          Save {t.name}
        </button>
      </div>
    </form>
  );
}
