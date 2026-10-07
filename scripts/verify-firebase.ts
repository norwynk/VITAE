/**
 * Emulator-backed journey through Auth, Firestore, Storage and the callable
 * Functions. Run with `npm run test:firebase`, which starts the emulators.
 */
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createFixtureStore } from '../src/domain/fixtures';
import { addDays, localDate } from '../src/domain/model';
import { runReminderSweep, REMINDER_TITLE } from '../functions/src/reminders';

const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-vitae';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const FUNCTIONS_BASE = `http://127.0.0.1:5001/${PROJECT}/europe-west1`;
const PASSWORD = 'emulator-only-password';

initializeApp({ projectId: PROJECT, storageBucket: `${PROJECT}.appspot.com` });
const auth = getAuth();
const db = getFirestore();

let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function createUser(uid: string, claims: Record<string, unknown> | null, emailVerified = true) {
  await auth.createUser({ uid, email: `${uid}@example.invalid`, password: PASSWORD, emailVerified });
  if (claims) await auth.setCustomUserClaims(uid, claims);
}

async function idToken(uid: string): Promise<string> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${uid}@example.invalid`, password: PASSWORD, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string };
  assert.ok(body.idToken, `sign-in failed for ${uid}`);
  return body.idToken;
}

type CallResult = { ok: true; data: any } | { ok: false; status: string; message: string };

async function call(fn: string, data: unknown, uid?: string): Promise<CallResult> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (uid) headers.authorization = `Bearer ${await idToken(uid)}`;
  const res = await fetch(`${FUNCTIONS_BASE}/${fn}`, { method: 'POST', headers, body: JSON.stringify({ data }) });
  const body = (await res.json()) as { result?: unknown; error?: { status: string; message: string } };
  if (body.error) return { ok: false, status: body.error.status, message: body.error.message };
  return { ok: true, data: body.result };
}

async function ok(fn: string, data: unknown, uid?: string) {
  const r = await call(fn, data, uid);
  if (!r.ok) throw new Error(`${fn} failed: ${r.status} ${r.message}`);
  return r.data;
}

async function denied(fn: string, data: unknown, uid: string | undefined, status: string) {
  const r = await call(fn, data, uid);
  assert.equal(r.ok, false, `${fn} should have been denied`);
  assert.equal((r as { status: string }).status, status, (r as { message: string }).message);
}

async function main() {
  const today = localDate(new Date());
  const fixtures = createFixtureStore();

  // Seed catalogue, stock and biomarker definitions only (no fixture members).
  for (const t of Object.values(fixtures.treatments)) await db.doc(`treatments/${t.id}`).set(t);
  for (const i of Object.values(fixtures.inventory)) await db.doc(`inventory/${i.id}`).set(i);

  await createUser('member1', null);
  await createUser('member2', { role: 'MEMBER' });
  await createUser('unverified', { role: 'MEMBER' }, false);
  await createUser('clin1', { role: 'CLINICIAN' });
  await createUser('clin2', { role: 'CLINICIAN' });
  await createUser('ops1', { role: 'OPERATIONS' });
  await createUser('admin1', { role: 'SUPER_ADMIN' });
  await createUser('ful1', { role: 'FULFILMENT' });
  await db.doc('providerAssignments/pa1').set({ id: 'pa1', memberId: 'member1', clinicianId: 'clin1', active: true, createdAt: new Date().toISOString() });

  console.log('Firebase emulator journey');

  await step('rejects unauthenticated and unverified callers', async () => {
    await denied('getWorkspace', {}, undefined, 'UNAUTHENTICATED');
    await denied('getWorkspace', {}, 'unverified', 'PERMISSION_DENIED');
    await denied('getWorkspace', {}, 'member1', 'PERMISSION_DENIED'); // no role yet
  });

  await step('provisions a member and grants only the MEMBER claim', async () => {
    const r = await ok('provisionMember', {}, 'member1');
    assert.equal(r.created, true);
    assert.equal((await auth.getUser('member1')).customClaims?.role, 'MEMBER');
    assert.equal((await ok('provisionMember', {}, 'member1')).created, false);
    await denied('provisionMember', {}, 'clin1', 'FAILED_PRECONDITION');
    await ok('provisionMember', {}, 'member2');
  });

  await step('member onboards and requests a pathway', async () => {
    await ok(
      'executeCommand',
      {
        type: 'onboard',
        profile: {
          firstName: 'Emu',
          lastName: 'Member',
          dateOfBirth: '1990-01-01',
          identity: { type: 'PASSPORT', number: 'EMU12345' },
          phone: '+27 82 000 0000',
          province: 'Gauteng',
          city: 'Johannesburg',
        },
        body: { heightCm: 170, weightKg: 80 },
        goals: { goals: ['Energy'], motivation: '' },
        health: { conditions: [], medications: '', allergies: '', pregnancyOrBreastfeeding: false, previousPeptideUse: false, notes: '' },
        lifestyle: { activityLevel: 'LIGHT', sleepHours: 7, smoking: false, alcoholUnitsPerWeek: 0, diet: '' },
        testingInterest: false,
        consents: { privacy: true, terms: true, healthData: true, clinicalService: true },
      },
      'member1',
    );
    const r = await ok('executeCommand', { type: 'request', treatmentId: 'trt-total-body-reset' }, 'member1');
    assert.ok(r.resultId);
    await denied('executeCommand', { type: 'request', treatmentId: 'trt-total-body-reset' }, 'member1', 'ALREADY_EXISTS');
  });

  let requestId = '';
  let approvalId = '';
  await step('only the assigned clinician can approve', async () => {
    requestId = (await db.collection('treatmentRequests').where('memberId', '==', 'member1').get()).docs[0].id;
    const review = {
      type: 'review',
      requestId,
      memberId: 'member1',
      decision: 'APPROVED',
      note: 'Emulator approval',
      reviewDate: addDays(today, 14),
      approval: {
        quantity: 2,
        dose: 1,
        doseUnit: 'click',
        schedule: { kind: 'DAILY' },
        startDate: today,
        durationDays: 28,
        reminderTime: '00:00',
        instructions: '',
      },
    };
    await denied('executeCommand', review, 'clin2', 'PERMISSION_DENIED');
    await denied('executeCommand', review, 'ops1', 'PERMISSION_DENIED');
    await denied('executeCommand', review, 'member1', 'PERMISSION_DENIED');
    approvalId = (await ok('executeCommand', review, 'clin1')).resultId;
    const approval = (await db.doc(`approvedTreatments/${approvalId}`).get()).data();
    assert.equal(approval?.status, 'ACTIVE');
    assert.equal(approval?.remainingQuantity, 2);
    assert.equal((await db.collection('reminders').where('approvalId', '==', approvalId).get()).size, 1);
  });

  await step('workspaces are scoped by role', async () => {
    await ok('executeCommand', { type: 'note', memberId: 'member1', body: 'Confidential emulator note' }, 'clin1');
    const member = (await ok('getWorkspace', {}, 'member1')).store;
    assert.ok(member.approvedTreatments[approvalId]);
    assert.equal(Object.keys(member.clinicalNotes).length, 0);
    assert.equal(Object.keys(member.operationalProfiles).length, 0);
    const other = (await ok('getWorkspace', {}, 'member2')).store;
    assert.equal(Object.keys(other.approvedTreatments).length, 0);
    assert.equal(other.members.member1, undefined);
    const clin = (await ok('getWorkspace', {}, 'clin1')).store;
    assert.equal(Object.keys(clin.clinicalNotes).length, 1);
    assert.ok(clin.medicalHistories.member1);
    const clin2 = (await ok('getWorkspace', {}, 'clin2')).store;
    assert.equal(Object.keys(clin2.members).length, 0);
    const ops = (await ok('getWorkspace', {}, 'ops1')).store;
    assert.equal(Object.keys(ops.medicalHistories).length, 0);
    assert.equal(Object.keys(ops.clinicalNotes).length, 0);
    assert.ok(ops.operationalProfiles.member1);
    const ful = (await ok('getWorkspace', {}, 'ful1')).store;
    assert.equal(Object.keys(ful.operationalProfiles).length, 0);
  });

  await step('unverified treatment cannot be ordered', async () => {
    const r = await call('executeCommand', { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1 }, 'member1');
    assert.equal(r.ok, false);
    assert.equal((r as { status: string }).status, 'FAILED_PRECONDITION');
  });

  await step('saving a delivery address creates no order or payment', async () => {
    await ok(
      'executeCommand',
      {
        type: 'deliveryAddress',
        address: { recipient: 'Emu Member', line1: '1 Test Rd', suburb: 'Test', city: 'Johannesburg', province: 'Gauteng', postalCode: '2000', phone: '+27 11 000 0000' },
      },
      'member1',
    );
    assert.equal((await db.collection('orders').get()).size, 0);
    assert.equal((await db.collection('payments').get()).size, 0);
  });

  await step('super admin catalogue update is gated and other roles are denied', async () => {
    const change = { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: { purchasable: true } };
    await denied('executeCommand', change, 'admin1', 'FAILED_PRECONDITION');
    await denied('executeCommand', change, 'ops1', 'PERMISSION_DENIED');
    await ok(
      'executeCommand',
      { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: { regulatoryStatus: 'VERIFIED', regulatoryReference: 'EMU-REF-0001', purchasable: true } },
      'admin1',
    );
  });

  await step('live checkout creates a payment-pending order and reserves stock transactionally', async () => {
    const orderId = (await ok('executeCommand', { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1 }, 'member1')).resultId;
    const order = (await db.doc(`orders/${orderId}`).get()).data();
    assert.equal(order?.status, 'PAYMENT_PENDING');
    assert.equal(order?.simulated, false);
    const payment = (await db.collection('payments').where('orderId', '==', orderId).get()).docs[0].data();
    assert.equal(payment.status, 'AWAITING_PROVIDER');
    assert.equal(payment.provider, 'NONE');
    assert.equal((await db.doc('inventory/PRK-TOTAL-BODY-RESET').get()).get('reserved'), 1);
    assert.equal((await db.doc(`approvedTreatments/${approvalId}`).get()).get('remainingQuantity'), 1);
    await denied('executeCommand', { type: 'orderStatus', orderId, memberId: 'member1', status: 'PAID' }, 'ops1', 'ALREADY_EXISTS');
    await denied('executeCommand', { type: 'orderStatus', orderId, memberId: 'member1', status: 'CANCELLED' }, 'ful1', 'PERMISSION_DENIED');
  });

  await step('reminder sweep uses a neutral sender and never duplicates', async () => {
    const pushed: unknown[] = [];
    const messaging = { sendEachForMulticast: async (m: unknown) => (pushed.push(m), { successCount: 1, failureCount: 0, responses: [] }) };
    await db.doc('users/member1').set({ pushTokens: ['emulator-token-0000000000000'] }, { merge: true });
    const first = await runReminderSweep(db, messaging as never, new Date());
    assert.equal(first.created, 1);
    assert.equal(first.pushed, 1);
    const second = await runReminderSweep(db, messaging as never, new Date());
    assert.equal(second.created, 0);
    const n = (await db.collection('notifications').where('kind', '==', 'REMINDER').get()).docs[0].data();
    assert.equal(n.title, REMINDER_TITLE);
    assert.ok(!JSON.stringify(n).includes('Total Body Reset'));
    assert.ok(!JSON.stringify(pushed).includes('One Stop Wellness'));
  });

  await step('adherence is recorded once', async () => {
    await ok('executeCommand', { type: 'adherence', approvalId, dueDate: today, action: 'TAKEN' }, 'member1');
    await denied('executeCommand', { type: 'adherence', approvalId, dueDate: today, action: 'MISSED' }, 'member1', 'ALREADY_EXISTS');
    await denied('executeCommand', { type: 'adherence', approvalId, dueDate: today, action: 'TAKEN' }, 'member2', 'NOT_FOUND');
  });

  await step('documents stay quarantined and access is scoped', async () => {
    const bucket = getStorage().bucket();
    await bucket.file('incoming/member1/lab.pdf').save(Buffer.from('%PDF-1.4 emulator'), { contentType: 'application/pdf' });
    await bucket.file('incoming/member2/lab.pdf').save(Buffer.from('%PDF-1.4 emulator'), { contentType: 'application/pdf' });
    await bucket.file('incoming/member1/page.html').save(Buffer.from('<html>'), { contentType: 'text/html' });
    await denied('registerDocument', { storagePath: 'incoming/member2/lab.pdf', name: 'Lab', category: 'LAB_RESULT' }, 'member1', 'PERMISSION_DENIED');
    await denied('registerDocument', { storagePath: 'incoming/member1/page.html', name: 'Page', category: 'OTHER' }, 'member1', 'INVALID_ARGUMENT');
    const { id, scanStatus } = await ok('registerDocument', { storagePath: 'incoming/member1/lab.pdf', name: 'Lab', category: 'LAB_RESULT' }, 'member1');
    assert.equal(scanStatus, 'QUARANTINED');
    await denied('accessDocument', { documentId: id }, 'member1', 'FAILED_PRECONDITION');
    await db.doc(`documents/${id}`).update({ scanStatus: 'CLEAN' });
    await denied('accessDocument', { documentId: id }, 'member2', 'PERMISSION_DENIED');
    await denied('accessDocument', { documentId: id }, 'clin2', 'PERMISSION_DENIED');
    await denied('accessDocument', { documentId: id }, 'ops1', 'PERMISSION_DENIED');
  });

  await step('every command and access is audited', async () => {
    const events = (await db.collection('auditEvents').get()).docs.map((d) => d.data());
    const actions = new Set(events.map((e) => e.action));
    for (const a of ['member_provisioned', 'onboard', 'request', 'review', 'note', 'catalogue', 'checkout', 'adherence', 'deliveryAddress', 'workspace_viewed', 'document_registered']) {
      assert.ok(actions.has(a), `missing audit action ${a}`);
    }
    assert.ok(!JSON.stringify(events).includes('Confidential emulator note'));
  });

  console.log(`\n${passed} emulator checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
