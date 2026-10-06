'use client';
import { Empty, formValues } from '../ui';
import { useWorkspace } from '../workspace-context';

export function StockTable() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const rows = Object.values(store.inventory).sort((a, b) => a.sku.localeCompare(b.sku));
  if (!rows.length) return <Empty>No SKUs.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Treatment</th>
            <th>On hand</th>
            <th>Reserved</th>
            <th>Set on hand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td>{i.sku}</td>
              <td>{store.treatments[i.treatmentId]?.name}</td>
              <td>{i.onHand}</td>
              <td>{i.reserved}</td>
              <td>
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run({ type: 'stockAdjust', sku: i.sku, onHand: Number(formValues(e.currentTarget).onHand) }, `Stock for ${i.sku} updated`);
                  }}
                >
                  <input name="onHand" type="number" min={i.reserved} defaultValue={i.onHand} aria-label={`On hand for ${i.sku}`} style={{ width: '6rem' }} />
                  <button type="submit" className="secondary" disabled={busy}>
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
