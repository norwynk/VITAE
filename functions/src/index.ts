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
import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import {
  type Actor,
  type AuditEvent,
  type DocumentRecord,
  type MemberRecord,
  type OperationalProfile,
  type Role,
  type UserRecord,
  MFA_REQUIRED_ROLES,
  ROLES,
  SERVICE_TIME_ZONE,
  visible,
} from '../../src/domain/model';
import {
  DomainError,
  applyCommand,
  commandMemberId,
  diffStores,
  parseCommand,
  randomIdFactory,
  toFirestoreData,
} from '../../src/domain/commands';
import { SIGNED_URL_TTL_MS, assertDocumentAccess, validateDocumentRegistration } from '../../src/domain/documents';
import { loadCatalogueScope, loadMemberScope, loadWorkspace } from './store';
import { runReminderSweep } from './reminders';

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';
const REGION = 'europe-west1';
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

export const executeCommand = onCall(callableOptions, async (request) => {
  try {
    const who = actor(request);
    const command = parseCommand(request.data);
    const memberId = commandMemberId(command, who);
    const result = await db.runTransaction(async (tx) => {
      const before = memberId ? await loadMemberScope(db, memberId, tx) : await loadCatalogueScope(db, tx);
      const applied = applyCommand(before, who, command, { now: new Date(), mode: 'live', newId });
      for (const change of diffStores(before, applied.store)) {
        tx.set(db.doc(`${change.collection}/${change.id}`), toFirestoreData(change.data as object));
      }
      return { resultId: applied.resultId, auditEventId: applied.auditEventId };
    });
    return { ok: true, ...result };
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

export const sendTreatmentReminders = onSchedule(
  { schedule: 'every 15 minutes', timeZone: SERVICE_TIME_ZONE, region: REGION, maxInstances: 1 },
  async () => {
    const result = await runReminderSweep(db, getMessaging(), new Date());
    logger.info('Reminder sweep complete', result);
  },
);
