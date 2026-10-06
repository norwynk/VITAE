/**
 * Firestore and Storage rules against the real emulators.
 * Run with `npm run test:rules` (wraps `firebase emulators:exec`).
 */
import { readFileSync } from 'node:fs';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-vitae',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'treatments/public'), { name: 'Public', public: true });
    await setDoc(doc(db, 'treatments/hidden'), { name: 'Hidden', public: false });
    await setDoc(doc(db, 'biomarkerDefinitions/b1'), { name: 'HbA1c' });
    await setDoc(doc(db, 'operationalProfiles/m1'), { memberId: 'm1' });
    await setDoc(doc(db, 'medicalHistories/m1'), { memberId: 'm1', conditions: [] });
    await setDoc(doc(db, 'members/m1'), { memberId: 'm1' });
    await setDoc(doc(db, 'clinicalNotes/n1'), { memberId: 'm1', body: 'x' });
    await setDoc(doc(db, 'orders/o1'), { memberId: 'm1' });
    await setDoc(doc(db, 'auditEvents/a1'), { actorId: 'm1' });
    await ctx.storage().ref('incoming/m1/existing.pdf').put(new Uint8Array([1]), { contentType: 'application/pdf' });
  });
});

const member = () => env.authenticatedContext('m1', { role: 'MEMBER', email_verified: true });
const unverified = () => env.authenticatedContext('m1', { role: 'MEMBER', email_verified: false });
const clinician = () => env.authenticatedContext('c1', { role: 'CLINICIAN', email_verified: true });
const ops = () => env.authenticatedContext('o1', { role: 'OPERATIONS', email_verified: true });
const admin = () => env.authenticatedContext('s1', { role: 'SUPER_ADMIN', email_verified: true });
const fulfilment = () => env.authenticatedContext('f1', { role: 'FULFILMENT', email_verified: true });

describe('firestore', () => {
  it('allows public treatment reads only, and never writes', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'treatments/public')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'treatments/hidden')));
    await assertFails(setDoc(doc(admin().firestore(), 'treatments/public'), { purchasable: true }));
    await assertFails(deleteDoc(doc(admin().firestore(), 'treatments/public')));
  });

  it('allows signed-in biomarker definition reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'biomarkerDefinitions/b1')));
    await assertSucceeds(getDoc(doc(member().firestore(), 'biomarkerDefinitions/b1')));
  });

  it('limits operational profiles to operations and super admin', async () => {
    await assertSucceeds(getDoc(doc(ops().firestore(), 'operationalProfiles/m1')));
    await assertSucceeds(getDoc(doc(admin().firestore(), 'operationalProfiles/m1')));
    await assertFails(getDoc(doc(member().firestore(), 'operationalProfiles/m1')));
    await assertFails(getDoc(doc(clinician().firestore(), 'operationalProfiles/m1')));
    await assertFails(getDoc(doc(fulfilment().firestore(), 'operationalProfiles/m1')));
    await assertFails(setDoc(doc(ops().firestore(), 'operationalProfiles/m1'), { memberId: 'm1' }));
  });

  it('denies direct health, clinical, order and audit reads, even to the owner', async () => {
    for (const path of ['medicalHistories/m1', 'members/m1', 'clinicalNotes/n1', 'orders/o1', 'auditEvents/a1']) {
      await assertFails(getDoc(doc(member().firestore(), path)));
      await assertFails(getDoc(doc(clinician().firestore(), path)));
    }
    await assertFails(getDocs(collection(ops().firestore(), 'medicalHistories')));
  });

  it('denies all direct client writes to privileged collections', async () => {
    const writes: [string, Record<string, unknown>][] = [
      ['medicalHistories/m1', { conditions: ['x'] }],
      ['approvedTreatments/a', { memberId: 'm1', status: 'ACTIVE' }],
      ['orders/o2', { memberId: 'm1', status: 'PAID' }],
      ['payments/p1', { status: 'SIMULATED_PAID' }],
      ['inventory/SKU', { onHand: 999 }],
      ['auditEvents/a2', { actorId: 'm1' }],
      ['users/m1', { role: 'SUPER_ADMIN' }],
      ['providerAssignments/x', { clinicianId: 'c1', memberId: 'm1', active: true }],
    ];
    for (const [path, data] of writes) {
      await assertFails(setDoc(doc(member().firestore(), path), data));
      await assertFails(setDoc(doc(admin().firestore(), path), data));
    }
  });
});

describe('storage', () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

  it('lets a verified member upload a safe file to their own quarantine path', async () => {
    await assertSucceeds(uploadBytes(ref(member().storage(), 'incoming/m1/lab.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertSucceeds(uploadBytes(ref(member().storage(), 'incoming/m1/photo.png'), pdf, { contentType: 'image/png' }));
  });

  it('rejects other paths, unverified users, unsafe types and oversized files', async () => {
    await assertFails(uploadBytes(ref(member().storage(), 'incoming/m2/lab.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(member().storage(), 'public/lab.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(unverified().storage(), 'incoming/m1/lab.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(member().storage(), 'incoming/m1/run.html'), pdf, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(member().storage(), 'incoming/m1/x.svg'), pdf, { contentType: 'image/svg+xml' }));
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(member().storage(), 'incoming/m1/big.pdf'), big, { contentType: 'application/pdf' }));
  });

  it('denies direct downloads, replacement and deletion', async () => {
    await assertFails(getBytes(ref(member().storage(), 'incoming/m1/existing.pdf')));
    await assertFails(getBytes(ref(clinician().storage(), 'incoming/m1/existing.pdf')));
    await assertFails(uploadBytes(ref(member().storage(), 'incoming/m1/existing.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(deleteObject(ref(member().storage(), 'incoming/m1/existing.pdf')));
  });
});
