/**
 * Paystack, the payment provider. Card details never reach PRICK: the member
 * pays on Paystack's own checkout page, and Paystack tells us the result.
 * Nothing is marked paid on the browser's word: every success is re-checked
 * with Paystack's API before it counts.
 *
 * The key is the PAYSTACK_SECRET_KEY secret: sk_test_… while testing (no real
 * money moves), sk_live_… once Paystack approves the business.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';

export const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
// Overridable so the emulator can run against a stand-in Paystack.
const API = (process.env.PAYSTACK_API_URL || 'https://api.paystack.co').replace(/\/+$/, '');

export class PaystackError extends Error {}

function key(): string {
  // The emulator has no Secret Manager: it uses a stand-in test key from its own env file.
  const k = (PAYSTACK_SECRET_KEY.value() || (process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.PAYSTACK_EMULATOR_KEY : '') || '').trim();
  if (!/^sk_(test|live)_\w+$/.test(k)) throw new PaystackError('Online payment isn’t set up yet (the PAYSTACK_SECRET_KEY secret).');
  return k;
}

/** True while the test key is in use: payments are pretend. */
export function testMode(): boolean {
  return key().startsWith('sk_test_');
}

async function call<T>(path: string, init?: { method: 'POST'; body: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: { authorization: `Bearer ${key()}`, 'content-type': 'application/json' },
    ...(init ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status || !json.data) throw new PaystackError(json.message || `Paystack answered ${res.status}`);
  return json.data;
}

/** Opens a checkout for an amount in cents; returns the page to send the member to. */
export async function initializeTransaction(input: {
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string }> {
  const data = await call<{ authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: input.amountCents,
      currency: 'ZAR',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    },
  });
  return { authorizationUrl: data.authorization_url };
}

export interface VerifiedTransaction {
  status: string;
  reference: string;
  amountCents: number;
  currency: string;
  id: string;
  channel?: string;
  /** "test" when a test key ran it. */
  domain?: string;
  paymentId?: string;
}

/** Paystack's own record of a transaction: the only thing that can mark a payment paid. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const d = await call<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
    id: number | string;
    channel?: string;
    domain?: string;
    metadata?: { paymentId?: string } | string | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  const metadata = typeof d.metadata === 'object' && d.metadata ? d.metadata : {};
  return {
    status: d.status,
    reference: d.reference,
    amountCents: d.amount,
    currency: d.currency,
    id: String(d.id),
    channel: d.channel,
    domain: d.domain,
    paymentId: metadata.paymentId,
  };
}

/** Paystack signs each webhook with an HMAC-SHA512 of the raw body, keyed with the secret key. */
export function validSignature(rawBody: Buffer, signature: string | undefined, secret = key()): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac('sha512', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Our payment id from a reference we created: "<paymentId>-<attempt>". */
export function paymentIdFrom(reference: string): string | undefined {
  return /^(pay_[A-Za-z0-9_]+)-[a-z0-9]+$/.exec(reference)?.[1];
}
