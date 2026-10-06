'use client';
import { ORDER_TRANSITIONS } from '@/domain/commands';
import { type Order, type OrderStatus, formatRand } from '@/domain/model';
import { Badge, Empty, fmtDateTime, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';

/** Orders with the transitions this role may perform, per the domain graph. */
export function OrderTable({ orders }: { orders: Order[] }) {
  const { workspace, run, busy } = useWorkspace();
  const { store, actor } = workspace;
  if (!orders.length) return <Empty>No orders.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Placed</th>
            <th>Treatment</th>
            <th>Qty</th>
            <th>Total</th>
            <th>Deliver to</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {[...orders]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((o) => {
              const next = Object.entries(ORDER_TRANSITIONS[o.status]).filter(([, roles]) => roles?.includes(actor.role)) as [
                OrderStatus,
                unknown,
              ][];
              const shipment = store.shipments[`shp_${o.id}`];
              return (
                <tr key={o.id}>
                  <td>{fmtDateTime(o.createdAt)}</td>
                  <td>{store.treatments[o.treatmentId]?.name ?? o.treatmentId}</td>
                  <td>{o.quantity}</td>
                  <td>{formatRand(o.totalCents)}</td>
                  <td className="small">
                    {o.deliveryAddress.recipient}, {o.deliveryAddress.line1}, {o.deliveryAddress.suburb}, {o.deliveryAddress.city}{' '}
                    {o.deliveryAddress.postalCode} · {o.deliveryAddress.phone}
                  </td>
                  <td>
                    {humanise(o.status)} {o.simulated && <Badge tone="alert">Simulated</Badge>}
                    {shipment?.courierReference && <div className="small muted">Ref {shipment.courierReference}</div>}
                    {o.status === 'PAYMENT_PENDING' && <div className="small muted">Awaiting payment provider</div>}
                  </td>
                  <td>
                    <div className="row">
                      {next.map(([status]) => (
                        <button
                          key={status}
                          type="button"
                          className={status === 'CANCELLED' ? 'secondary' : undefined}
                          disabled={busy}
                          onClick={() => {
                            const courierReference = status === 'SHIPPED' ? window.prompt('Courier reference (optional)') ?? undefined : undefined;
                            void run(
                              { type: 'orderStatus', orderId: o.id, memberId: o.memberId, status: status as Exclude<OrderStatus, 'PAYMENT_PENDING'>, courierReference: courierReference || undefined },
                              `Order marked ${humanise(status).toLowerCase()}`,
                            );
                          }}
                        >
                          Mark {humanise(status).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
