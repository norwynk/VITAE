'use client';
import { isNontrivialReference } from '@/domain/commands';
import { type Treatment, REGULATORY_STATUSES, formatRand } from '@/domain/model';
import { Badge, Card, Notice, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';
import { StockTable } from './StockTable';

export function AdminHome() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const treatments = Object.values(store.treatments).sort((a, b) => a.name.localeCompare(b.name));
  const audit = Object.values(store.auditEvents)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 100);
  return (
    <div className="stack">
      <h1>Administration</h1>
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
