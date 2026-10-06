/**
 * Scoped Firestore reads. Every loader reads only what the actor's role is
 * entitled to; `visible()` is then applied as a second projection.
 */
import type { Firestore, Query, Transaction } from 'firebase-admin/firestore';
import {
  type Actor,
  type CollectionName,
  type Store,
  FULFILMENT_ORDER_STATUSES,
  MEMBER_COLLECTIONS,
  OPERATIONS_TOPICS,
  emptyStore,
} from '../../src/domain/model';

export const OPERATIONAL_LIMIT = 250;
export const AUDIT_LIMIT = 100;
/** Upper bound on members loaded into one clinician workspace. */
export const CLINICIAN_MEMBER_LIMIT = 50;

type Reader = { get: (q: Query) => Promise<FirebaseFirestore.QuerySnapshot> };

function reader(db: Firestore, tx?: Transaction): Reader {
  return tx ? { get: (q) => tx.get(q) } : { get: (q) => q.get() };
}

function put(store: Store, collection: CollectionName, snap: FirebaseFirestore.QuerySnapshot) {
  const target = store[collection] as Record<string, unknown>;
  for (const d of snap.docs) target[d.id] = { ...d.data(), id: d.id };
}

async function loadAll(db: Firestore, r: Reader, store: Store, collection: CollectionName, limit?: number) {
  const q = limit ? db.collection(collection).limit(limit) : db.collection(collection);
  put(store, collection, await r.get(q));
}

/** Every member-keyed record for one member, plus catalogue and stock. */
export async function loadMemberScope(db: Firestore, memberId: string, tx?: Transaction): Promise<Store> {
  const r = reader(db, tx);
  const store = emptyStore();
  await Promise.all([
    ...MEMBER_COLLECTIONS.map(async (c) => put(store, c, await r.get(db.collection(c).where('memberId', '==', memberId)))),
    loadAll(db, r, store, 'treatments'),
    loadAll(db, r, store, 'inventory'),
  ]);
  return store;
}

/** Catalogue-level commands touch only treatments and stock. */
export async function loadCatalogueScope(db: Firestore, tx?: Transaction): Promise<Store> {
  const r = reader(db, tx);
  const store = emptyStore();
  await Promise.all([loadAll(db, r, store, 'treatments'), loadAll(db, r, store, 'inventory')]);
  return store;
}

function merge(into: Store, from: Store) {
  for (const c of Object.keys(from) as CollectionName[]) Object.assign(into[c], from[c]);
}

export async function assignedMemberIds(db: Firestore, clinicianId: string): Promise<string[]> {
  const snap = await db
    .collection('providerAssignments')
    .where('clinicianId', '==', clinicianId)
    .where('active', '==', true)
    .limit(CLINICIAN_MEMBER_LIMIT)
    .get();
  return [...new Set(snap.docs.map((d) => d.get('memberId') as string))];
}

export async function loadWorkspace(db: Firestore, actor: Actor): Promise<Store> {
  const r = reader(db);
  const store = emptyStore();
  switch (actor.role) {
    case 'MEMBER': {
      merge(store, await loadMemberScope(db, actor.uid));
      await loadAll(db, r, store, 'biomarkerDefinitions');
      put(store, 'users', await db.collection('users').where('__name__', '==', actor.uid).get());
      break;
    }
    case 'CLINICIAN': {
      for (const memberId of await assignedMemberIds(db, actor.uid)) merge(store, await loadMemberScope(db, memberId));
      await loadAll(db, r, store, 'treatments');
      await loadAll(db, r, store, 'biomarkerDefinitions');
      break;
    }
    case 'OPERATIONS': {
      const opsTopics = [...OPERATIONS_TOPICS];
      await Promise.all([
        loadAll(db, r, store, 'operationalProfiles', OPERATIONAL_LIMIT),
        loadAll(db, r, store, 'treatments'),
        loadAll(db, r, store, 'inventory'),
        r.get(db.collection('orders').orderBy('updatedAt', 'desc').limit(OPERATIONAL_LIMIT)).then((s) => put(store, 'orders', s)),
        loadAll(db, r, store, 'shipments', OPERATIONAL_LIMIT),
        loadAll(db, r, store, 'payments', OPERATIONAL_LIMIT),
        loadAll(db, r, store, 'followUps', OPERATIONAL_LIMIT),
        r
          .get(db.collection('messageThreads').where('topic', 'in', opsTopics).limit(OPERATIONAL_LIMIT))
          .then((s) => put(store, 'messageThreads', s)),
        r
          .get(db.collection('messages').where('topic', 'in', opsTopics).limit(OPERATIONAL_LIMIT))
          .then((s) => put(store, 'messages', s)),
      ]);
      break;
    }
    case 'FULFILMENT': {
      const statuses = [...FULFILMENT_ORDER_STATUSES, 'DELIVERED'];
      put(store, 'orders', await db.collection('orders').where('status', 'in', statuses).limit(OPERATIONAL_LIMIT).get());
      const orderIds = Object.keys(store.orders);
      for (let i = 0; i < orderIds.length; i += 30) {
        const chunk = orderIds.slice(i, i + 30);
        put(store, 'orderItems', await db.collection('orderItems').where('orderId', 'in', chunk).get());
        put(store, 'shipments', await db.collection('shipments').where('orderId', 'in', chunk).get());
      }
      await Promise.all([loadAll(db, r, store, 'inventory'), loadAll(db, r, store, 'treatments')]);
      break;
    }
    case 'SUPER_ADMIN': {
      await Promise.all([
        loadAll(db, r, store, 'treatments'),
        loadAll(db, r, store, 'inventory'),
        loadAll(db, r, store, 'operationalProfiles', OPERATIONAL_LIMIT),
        loadAll(db, r, store, 'biomarkerDefinitions'),
        loadAll(db, r, store, 'careTeams'),
        loadAll(db, r, store, 'corporateAccounts'),
        loadAll(db, r, store, 'users', OPERATIONAL_LIMIT),
        r.get(db.collection('auditEvents').orderBy('at', 'desc').limit(AUDIT_LIMIT)).then((s) => put(store, 'auditEvents', s)),
      ]);
      break;
    }
    case 'CORPORATE_ADMIN': {
      put(store, 'corporateAccounts', await db.collection('corporateAccounts').where('adminIds', 'array-contains', actor.uid).get());
      put(store, 'treatments', await db.collection('treatments').where('public', '==', true).get());
      break;
    }
  }
  return store;
}
