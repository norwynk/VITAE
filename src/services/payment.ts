/**
 * Payment adapters. No production payment gateway, webhook verification,
 * reconciliation or refunds exist yet. Live checkout therefore creates a
 * PAYMENT_PENDING order with an AWAITING_PROVIDER payment record and never
 * reports success; only a verified provider webhook may confirm payment.
 */
import type { DataMode } from '@/domain/commands';

export interface PaymentAdapter {
  id: 'unconfigured' | 'development';
  /** Whether this adapter can actually collect money. */
  canCollect: boolean;
  /** Plain-language status for the member. */
  memberNotice: string;
}

export const unconfiguredPayments: PaymentAdapter = {
  id: 'unconfigured',
  canCollect: false,
  memberNotice: 'Online payment is not connected yet. Orders are held as payment pending and you will not be charged.',
};

export const developmentPayments: PaymentAdapter = {
  id: 'development',
  canCollect: false,
  memberNotice: 'Demo mode: payment is simulated. No money is charged.',
};

export function paymentAdapterFor(mode: DataMode): PaymentAdapter {
  return mode === 'demo' ? developmentPayments : unconfiguredPayments;
}
