'use client';
import { Card } from '../ui';
import { useWorkspace } from '../workspace-context';
import { OrderTable } from './OrderTable';

export function FulfilmentHome() {
  const { workspace } = useWorkspace();
  const orders = Object.values(workspace.store.orders);
  return (
    <div className="stack">
      <h1>Fulfilment</h1>
      <p className="muted">
        Paid orders ready for dispatch. Only fulfilment can mark an order dispensed. No pharmacy or courier integration
        exists yet, so these steps are recorded manually.
      </p>
      <Card title="Dispatch queue">
        <OrderTable orders={orders.filter((o) => o.status !== 'DELIVERED')} />
      </Card>
      <Card title="Delivered">
        <OrderTable orders={orders.filter((o) => o.status === 'DELIVERED')} />
      </Card>
    </div>
  );
}
