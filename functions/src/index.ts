/**
 * Trusted Firebase backend. Identity and role come only from verified
 * Firebase Auth tokens; all health, clinical and order writes go through
 * `executeCommand`, which runs the shared domain rules in a transaction.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { type CallableRequest, HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import {
  type Actor,
  type AuditEvent,
  type DocumentRecord,
  type MemberRecord,
  type OperationalProfile,
  type Payment,
  type PenRelease,
  type ProviderAssignment,
  type Role,
  type UserRecord,
  MFA_REQUIRED_ROLES,
  ROLES,
  SERVICE_TIME_ZONE,
  type Store,
  emptyStore,
  visible,
} from '../../src/domain/model';
import {
  DomainError,
  applyCommand,
  applyConfirmedPayment,
  applyRefund,
  commandMemberId,
  diffStores,
  parseCommand,
  randomIdFactory,
  toFirestoreData,
} from '../../src/domain/commands';
import { SIGNED_URL_TTL_MS, assertDocumentAccess, validateDocumentRegistration } from '../../src/domain/documents';
import { loadCatalogueScope, loadMemberScope, loadWorkspace } from './store';
import { runReminderSweep } from './reminders';
import { MAIL_LOGIN, SITE, notifyPaid, notifyTeam, sendTestEmail } from './mail';
import { PAYSTACK_SECRET_KEY, PaystackError, initializeTransaction, paymentIdFrom, validSignature, verifyTransaction } from './paystack';

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';
// Johannesburg, next to the Firestore database, so health data stays in South Africa.
const REGION = 'africa-south1';
setGlobalOptions({ region: REGION, maxInstances: 10 });

const callableOptions = { enforceAppCheck: !IS_EMULATOR, region: REGION, maxInstances: 10 };

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Authenticated, email-verified actor with a role claim; staff need MFA in production. */
function actor(request: CallableRequest): Actor {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in to continue');
  if (auth.token.email_verified !== true) throw new HttpsError('permission-denied', 'Verify your email address first');
  const role = auth.token.role;
  if (!isRole(role)) throw new HttpsError('permission-denied', 'Your account has not been set up yet');
  if (!IS_EMULATOR && MFA_REQUIRED_ROLES.includes(role) && !auth.token.firebase?.sign_in_second_factor) {
    throw new HttpsError('permission-denied', 'Staff accounts must sign in with a second factor');
  }
  return { uid: auth.uid, role };
}

function toHttpsError(e: unknown): HttpsError {
  if (e instanceof HttpsError) return e;
  if (e instanceof DomainError) {
    const code = (
      {
        FORBIDDEN: 'permission-denied',
        NOT_FOUND: 'not-found',
        INVALID: 'invalid-argument',
        CONFLICT: 'already-exists',
        PRECONDITION: 'failed-precondition',
      } as const
    )[e.code];
    return new HttpsError(code, e.message);
  }
  logger.error('Unhandled error', e);
  return new HttpsError('internal', 'Something went wrong');
}

const newId = randomIdFactory();

async function audit(event: Omit<AuditEvent, 'id' | 'at'>, at = new Date()) {
  const id = newId('aud');
  await db.doc(`auditEvents/${id}`).set(toFirestoreData({ ...event, id, at: at.toISOString() }));
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

/**
 * First sign-in for a self-registered member. Grants the MEMBER claim only to
 * accounts with no role; staff roles are set by trusted admin tooling.
 */
export const provisionMember = onCall(callableOptions, async (request) => {
  try {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in to continue');
    if (auth.token.email_verified !== true) throw new HttpsError('permission-denied', 'Verify your email address first');
    const existingRole = auth.token.role;
    if (existingRole !== undefined && existingRole !== 'MEMBER') {
      throw new HttpsError('failed-precondition', 'Only member accounts can be provisioned here');
    }
    const uid = auth.uid;
    const email = auth.token.email ?? '';
    const now = new Date().toISOString();
    const created = await db.runTransaction(async (tx) => {
      const memberRef = db.doc(`members/${uid}`);
      if ((await tx.get(memberRef)).exists) return false;
      // New members go straight to the default clinician (set with `npm run staff -- default-clinician`).
      const clinicianId = (await tx.get(db.doc('config/care'))).get('defaultClinicianId');
      const member: MemberRecord = { id: uid, memberId: uid, firstName: '', lastName: '', email, createdAt: now, updatedAt: now };
      const profile: OperationalProfile = {
        id: uid,
        memberId: uid,
        displayName: 'New member',
        onboardingStatus: 'NOT_STARTED',
        hasDeliveryAddress: false,
        openRequestCount: 0,
        consentWithdrawn: false,
        lastActivityAt: now,
      };
      const user: UserRecord = { id: uid, email, displayName: '', role: 'MEMBER', createdAt: now, updatedAt: now };
      tx.set(memberRef, member);
      tx.set(db.doc(`operationalProfiles/${uid}`), profile);
      tx.set(db.doc(`users/${uid}`), user, { merge: true });
      if (typeof clinicianId === 'string' && clinicianId) {
        const assignment: ProviderAssignment = { id: `pa_${uid}_${clinicianId}`, memberId: uid, clinicianId, active: true, createdAt: now };
        tx.set(db.doc(`providerAssignments/${assignment.id}`), assignment);
      }
      return true;
    });
    if (existingRole === undefined) await getAuth().setCustomUserClaims(uid, { role: 'MEMBER' });
    if (created) await audit({ actorId: uid, actorRole: 'MEMBER', action: 'member_provisioned', memberId: uid, targets: [uid] });
    return { created, refreshToken: existingRole === undefined };
  } catch (e) {
    throw toHttpsError(e);
  }
});

export const getWorkspace = onCall(callableOptions, async (request) => {
  try {
    const who = actor(request);
    const store = visible(await loadWorkspace(db, who), who);
    await audit({ actorId: who.uid, actorRole: who.role, action: 'workspace_viewed', memberId: who.role === 'MEMBER' ? who.uid : undefined, targets: [] });
    return { actor: who, mode: 'live' as const, store };
  } catch (e) {
    throw toHttpsError(e);
  }
});

export const executeCommand = onCall({ ...callableOptions, secrets: [MAIL_LOGIN] }, async (request) => {
  try {
    const who = actor(request);
    const command = parseCommand(request.data);
    const memberId = commandMemberId(command, who);
    const result = await db.runTransaction(async (tx) => {
      const before = memberId ? await loadMemberScope(db, memberId, tx) : await loadCatalogueScope(db, tx);
      // The acting user's own record, so approvals carry the clinician's name.
      const self = await tx.get(db.doc(`users/${who.uid}`));
      if (self.exists) before.users[who.uid] = { ...(self.data() as UserRecord), id: who.uid };
      const applied = applyCommand(before, who, command, { now: new Date(), mode: 'live', newId });
      for (const change of diffStores(before, applied.store)) {
        tx.set(db.doc(`${change.collection}/${change.id}`), toFirestoreData(change.data as object));
      }
      return { resultId: applied.resultId, auditEventId: applied.auditEventId };
    });
    // Emails to the clinician and the team (never health details). Best effort.
    await notifyTeam(db, command, memberId, result.resultId);
    return { ok: true, ...result };
  } catch (e) {
    throw toHttpsError(e);
  }
});

// ---------------------------------------------------------------------------
// Payments (Paystack)
// ---------------------------------------------------------------------------

type Settled = 'PAID' | 'PENDING' | 'FAILED';

/**
 * Just the records a payment touches: the payment, its pen and the member's
 * summary. Paystack's notice and the member's return often arrive together,
 * so the transaction locks as little as possible.
 */
async function paymentScope(t: FirebaseFirestore.Transaction, paymentId: string): Promise<Store> {
  const store = emptyStore();
  const payment = (await t.get(db.doc(`payments/${paymentId}`))).data() as Payment | undefined;
  if (!payment) return store;
  store.payments[payment.id] = payment;
  const [release, profile] = await Promise.all([
    payment.releaseId ? t.get(db.doc(`penReleases/${payment.releaseId}`)) : undefined,
    t.get(db.doc(`operationalProfiles/${payment.memberId}`)),
  ]);
  if (release?.exists) store.penReleases[release.id] = { ...(release.data() as PenRelease), id: release.id };
  if (profile.exists) store.operationalProfiles[profile.id] = { ...(profile.data() as OperationalProfile), id: profile.id };
  return store;
}

/**
 * Asks Paystack for its own record of a transaction and, if it succeeded,
 * marks the payment paid and moves the pen to the send list. The browser's
 * word never counts. Safe to repeat: a second call changes nothing.
 */
async function settle(reference: string): Promise<Settled> {
  const tx = await verifyTransaction(reference);
  if (tx.status !== 'success') return tx.status === 'failed' || tx.status === 'reversed' ? 'FAILED' : 'PENDING';
  const paymentId = tx.paymentId ?? paymentIdFrom(tx.reference);
  const ref = paymentId ? db.doc(`payments/${paymentId}`) : undefined;
  const found = ref && (await ref.get()).data() as Payment | undefined;
  if (!ref || !found) throw new DomainError('NOT_FOUND', `Paystack paid ${tx.reference}, which matches no PRICK payment`);
  if (found.status === 'PAID' || found.status === 'REFUNDED') return 'PAID';
  const changed = await db.runTransaction(async (t) => {
    const before = await paymentScope(t, found.id);
    const applied = applyConfirmedPayment(
      before,
      {
        paymentId: found.id,
        reference: tx.reference,
        amountCents: tx.amountCents,
        currency: tx.currency,
        providerTransactionId: tx.id,
        channel: tx.channel,
        testMode: tx.domain === 'test',
      },
      { now: new Date(), mode: 'live', newId },
    );
    if (!applied.changed) return false;
    for (const change of diffStores(before, applied.store)) {
      t.set(db.doc(`${change.collection}/${change.id}`), toFirestoreData(change.data as object));
    }
    return true;
  });
  if (changed) {
    const payment = (await ref.get()).data() as Payment;
    const release = payment.releaseId ? ((await db.doc(`penReleases/${payment.releaseId}`).get()).data() as PenRelease | undefined) : undefined;
    await notifyPaid(db, payment, release);
  }
  return 'PAID';
}

function paystackHttpsError(e: unknown): HttpsError {
  if (e instanceof PaystackError) {
    logger.error('Paystack', e.message);
    return new HttpsError('unavailable', 'Payment couldn’t be started just now. Nothing was charged. Please try again in a minute.');
  }
  return toHttpsError(e);
}

/** The member's own approved pen that is waiting for payment, and its payment record. */
async function unpaidRelease(who: Actor, releaseId: unknown): Promise<{ release: PenRelease; payment: Payment }> {
  if (who.role !== 'MEMBER') throw new HttpsError('permission-denied', 'Only members pay for pens');
  if (typeof releaseId !== 'string' || !/^rel_\w{1,40}$/.test(releaseId)) throw new HttpsError('invalid-argument', 'releaseId is required');
  const release = (await db.doc(`penReleases/${releaseId}`).get()).data() as PenRelease | undefined;
  if (!release || release.memberId !== who.uid || !release.paymentId) throw new HttpsError('not-found', 'Pen not found');
  const payment = (await db.doc(`payments/${release.paymentId}`).get()).data() as Payment | undefined;
  if (!payment || payment.memberId !== who.uid) throw new HttpsError('not-found', 'Payment not found');
  return { release, payment };
}

/** Member: open Paystack's checkout for an approved pen. Returns the page to go to. */
export const startPayment = onCall({ ...callableOptions, secrets: [PAYSTACK_SECRET_KEY] }, async (request) => {
  try {
    const who = actor(request);
    const { release, payment } = await unpaidRelease(who, request.data?.releaseId);
    if (release.status !== 'AWAITING_PAYMENT' || payment.status !== 'AWAITING_PROVIDER') {
      throw new HttpsError('failed-precondition', 'This pen is already paid for');
    }
    const email = request.auth?.token.email;
    if (!email) throw new HttpsError('failed-precondition', 'Your account needs an email address for the receipt');
    // A fresh reference per attempt: Paystack refuses to reuse one.
    const reference = `${payment.id}-${Date.now().toString(36)}`;
    const { authorizationUrl } = await initializeTransaction({
      email,
      amountCents: payment.amountCents,
      reference,
      callbackUrl: `${SITE}/app?paid=${release.id}`,
      metadata: { paymentId: payment.id, releaseId: release.id, memberId: who.uid },
    });
    await db.doc(`payments/${payment.id}`).update({ reference, updatedAt: new Date().toISOString() });
    await audit({ actorId: who.uid, actorRole: who.role, action: 'paymentStarted', memberId: who.uid, targets: [payment.id] });
    return { url: authorizationUrl };
  } catch (e) {
    throw paystackHttpsError(e);
  }
});

/** Member, back from Paystack: has it gone through? Checks with Paystack, so it works even before the webhook arrives. */
export const confirmPayment = onCall({ ...callableOptions, secrets: [PAYSTACK_SECRET_KEY, MAIL_LOGIN] }, async (request) => {
  try {
    const who = actor(request);
    const { payment } = await unpaidRelease(who, request.data?.releaseId);
    if (payment.status === 'PAID' || payment.status === 'REFUNDED') return { status: 'PAID' as Settled };
    if (!payment.reference) return { status: 'PENDING' as Settled };
    return { status: await settle(payment.reference) };
  } catch (e) {
    throw paystackHttpsError(e);
  }
});

/**
 * Paystack's notice that a payment succeeded or was refunded. Set this
 * function's address as the webhook URL in the Paystack dashboard. Every
 * notice must carry Paystack's signature; anything else is turned away.
 */
export const paystackWebhook = onRequest(
  { region: REGION, maxInstances: 10, invoker: 'public', secrets: [PAYSTACK_SECRET_KEY, MAIL_LOGIN] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }
    if (!validSignature(req.rawBody, req.get('x-paystack-signature'))) {
      logger.warn('Paystack webhook with a bad signature was ignored');
      res.status(401).end();
      return;
    }
    const { event, data } = (req.body ?? {}) as {
      event?: string;
      data?: { reference?: string; transaction_reference?: string; transaction?: { reference?: string } };
    };
    try {
      if (event === 'charge.success' && data?.reference) {
        await settle(data.reference);
      } else if (event === 'refund.processed') {
        const reference = data?.transaction_reference ?? data?.transaction?.reference ?? '';
        const paymentId = paymentIdFrom(reference);
        const found = paymentId && ((await db.doc(`payments/${paymentId}`).get()).data() as Payment | undefined);
        if (found) {
          await db.runTransaction(async (t) => {
            const before = await paymentScope(t, found.id);
            const applied = applyRefund(before, found.id, { now: new Date(), mode: 'live', newId });
            for (const change of diffStores(before, applied.store)) {
              t.set(db.doc(`${change.collection}/${change.id}`), toFirestoreData(change.data as object));
            }
          });
        }
      }
      res.status(200).end();
    } catch (e) {
      if (e instanceof DomainError) {
        // Wrong amount or unknown payment: retrying can't fix it, so it's logged for a person to look at.
        logger.error('Paystack webhook needs attention', { event, reference: data?.reference, problem: e.message });
        res.status(200).end();
        return;
      }
      // Anything else (Paystack or the database briefly down): Paystack retries.
      logger.error('Paystack webhook failed', e);
      res.status(500).end();
    }
  },
);

/** Admin only: send a clearly labelled test email to the clinician and the admins. */
export const sendTeamTestEmail = onCall({ ...callableOptions, secrets: [MAIL_LOGIN] }, async (request) => {
  try {
    const who = actor(request);
    if (who.role !== 'SUPER_ADMIN') throw new HttpsError('permission-denied', 'Only an admin can send a test email');
    const email = request.auth?.token.email ?? '';
    let result;
    try {
      result = await sendTestEmail(email);
    } catch (e) {
      throw new HttpsError('failed-precondition', `The email could not be sent: ${(e as Error).message}`);
    }
    await audit({ actorId: who.uid, actorRole: who.role, action: 'test_email_sent', targets: [] });
    return result;
  } catch (e) {
    throw toHttpsError(e);
  }
});

export const registerPushToken = onCall(callableOptions, async (request) => {
  try {
    const who = actor(request);
    if (who.role !== 'MEMBER') throw new HttpsError('permission-denied', 'Only members receive reminders');
    const token = request.data?.token;
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) throw new HttpsError('invalid-argument', 'Invalid push token');
    await db.doc(`users/${who.uid}`).set({ pushTokens: FieldValue.arrayUnion(token), updatedAt: new Date().toISOString() }, { merge: true });
    await audit({ actorId: who.uid, actorRole: who.role, action: 'push_token_registered', memberId: who.uid, targets: [who.uid] });
    return { ok: true };
  } catch (e) {
    throw toHttpsError(e);
  }
});

export const registerDocument = onCall(callableOptions, async (request) => {
  try {
    const who = actor(request);
    const { storagePath, name, category } = (request.data ?? {}) as Record<string, unknown>;
    if (typeof storagePath !== 'string' || typeof name !== 'string' || typeof category !== 'string') {
      throw new HttpsError('invalid-argument', 'storagePath, name and category are required');
    }
    const file = getStorage().bucket().file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new HttpsError('not-found', 'Upload not found');
    const [metadata] = await file.getMetadata();
    let checked;
    try {
      checked = validateDocumentRegistration({
        actor: who,
        storagePath,
        name,
        category,
        contentType: metadata.contentType,
        sizeBytes: Number(metadata.size),
      });
    } catch (e) {
      if (e instanceof DomainError && e.code === 'INVALID' && storagePath.startsWith(`incoming/${who.uid}/`)) await file.delete();
      throw e;
    }
    // Remove any download token so no public-style URL can exist.
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
    const id = newId('doc');
    const record: DocumentRecord = {
      id,
      memberId: who.uid,
      name: name.trim(),
      category: checked.category,
      contentType: checked.contentType,
      sizeBytes: Number(metadata.size),
      storagePath,
      scanStatus: 'QUARANTINED',
      uploadedAt: new Date().toISOString(),
    };
    await db.doc(`documents/${id}`).set(record);
    await audit({ actorId: who.uid, actorRole: who.role, action: 'document_registered', memberId: who.uid, targets: [id] });
    return { id, scanStatus: record.scanStatus };
  } catch (e) {
    throw toHttpsError(e);
  }
});

export const accessDocument = onCall(callableOptions, async (request) => {
  try {
    const who = actor(request);
    const documentId = request.data?.documentId;
    if (typeof documentId !== 'string' || !documentId) throw new HttpsError('invalid-argument', 'documentId is required');
    const snap = await db.doc(`documents/${documentId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Document not found');
    const doc = snap.data() as DocumentRecord;
    let assigned = false;
    if (who.role === 'CLINICIAN') {
      const a = await db
        .collection('providerAssignments')
        .where('clinicianId', '==', who.uid)
        .where('memberId', '==', doc.memberId)
        .where('active', '==', true)
        .limit(1)
        .get();
      assigned = !a.empty;
    }
    assertDocumentAccess(who, doc, assigned);
    await audit({ actorId: who.uid, actorRole: who.role, action: 'document_accessed', memberId: doc.memberId, targets: [documentId] });
    const [url] = await getStorage()
      .bucket()
      .file(doc.storagePath)
      .getSignedUrl({ action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS });
    return { url, expiresInSeconds: SIGNED_URL_TTL_MS / 1000 };
  } catch (e) {
    throw toHttpsError(e);
  }
});

// Cloud Scheduler has no Johannesburg location, so the reminder timer runs in Belgium. Data stays in the Johannesburg database.
const SCHEDULER_REGION = 'europe-west1';
export const sendTreatmentReminders = onSchedule(
  { schedule: 'every 15 minutes', timeZone: SERVICE_TIME_ZONE, region: SCHEDULER_REGION, maxInstances: 1 },
  async () => {
    const result = await runReminderSweep(db, getMessaging(), new Date());
    logger.info('Reminder sweep complete', result);
  },
);
