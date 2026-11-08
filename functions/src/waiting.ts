/**
 * Hourly check for anything left waiting on the clinician. It reads the
 * database rather than relying on the first email, so a request whose email
 * failed is still chased. Reminders name people and waiting times only.
 */
import { FieldValue, type Firestore, type QuerySnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { type CollectionName, type MemberRecord, type Store, PENDING_REQUEST_STATUSES, emptyStore, localDate } from '../../src/domain/model';
import { type WaitingItem, WAITING_LABEL, isSendingHour, reminderDue, waitedLabel, waitingOnClinician, workingHours } from '../../src/domain/waiting';

const ALREADY_EXISTS = 6;
const SWEEP_LIMIT = 5000;
const SITE = (process.env.SITE_URL || 'https://prick-site--prick-c3c43.europe-west4.hosted.app').replace(/\/+$/, '');

export interface StaffMail {
  send: (to: string[], subject: string, text: string) => Promise<void>;
  adminEmails: () => Promise<string[]>;
}

export interface WaitingSweepResult {
  waiting: number;
  emails: number;
}

function put(store: Store, collection: CollectionName, snap: QuerySnapshot) {
  const target = store[collection] as Record<string, unknown>;
  for (const d of snap.docs) target[d.id] = { ...d.data(), id: d.id };
}

async function loadWaitingStore(db: Firestore): Promise<Store> {
  const store = emptyStore();
  const [requests, threads, messages] = await Promise.all([
    db.collection('treatmentRequests').where('status', 'in', [...PENDING_REQUEST_STATUSES]).limit(SWEEP_LIMIT).get(),
    db.collection('messageThreads').orderBy('lastMessageAt', 'desc').limit(SWEEP_LIMIT).get(),
    db.collection('messages').orderBy('createdAt', 'desc').limit(SWEEP_LIMIT).get(),
  ]);
  put(store, 'treatmentRequests', requests);
  put(store, 'messageThreads', threads);
  put(store, 'messages', messages);
  // A new screening also counts as answering "needs information".
  const asked = new Set(Object.values(store.treatmentRequests).filter((r) => r.status === 'NEEDS_INFORMATION').map((r) => r.memberId));
  await Promise.all([...asked].map(async (id) => put(store, 'healthAssessments', await db.collection('healthAssessments').where('memberId', '==', id).get())));
  return store;
}

/** Keeps the admin's waiting list right, including anything from before it existed. */
async function refreshWaitingSince(db: Firestore, items: WaitingItem[]) {
  const oldest = new Map<string, string>();
  for (const i of items) if (!oldest.has(i.memberId)) oldest.set(i.memberId, i.since);
  const [listed, ...found] = await Promise.all([
    db.collection('operationalProfiles').where('waitingSince', '>', '').limit(SWEEP_LIMIT).get(),
    ...[...oldest.keys()].map((id) => db.doc(`operationalProfiles/${id}`).get()),
  ]);
  await Promise.all([
    ...listed.docs.filter((d) => !oldest.has(d.id)).map((d) => d.ref.update({ waitingSince: FieldValue.delete() })),
    ...found.filter((d) => d.exists && d.get('waitingSince') !== oldest.get(d.id)).map((d) => d.ref.update({ waitingSince: oldest.get(d.id) })),
  ]);
}

/** Records a reminder before it goes, so a repeated run can't send it twice. */
async function claim(db: Firestore, id: string, at: string): Promise<boolean> {
  try {
    await db.doc(`staffReminders/${id}`).create({ sentAt: at });
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === ALREADY_EXISTS) return false;
    throw e;
  }
}

/** Sends once; if the email fails the claims are released and the next run tries again. */
async function sendClaimed(db: Firestore, claims: string[], mail: StaffMail, to: string[], subject: string, text: string): Promise<number> {
  try {
    await mail.send(to, subject, text);
    return 1;
  } catch (e) {
    logger.warn('Waiting reminder failed; will retry', e);
    await Promise.all(claims.map((id) => db.doc(`staffReminders/${id}`).delete()));
    return 0;
  }
}

async function claimAll(db: Firestore, items: WaitingItem[], audience: string, now: Date) {
  const claimed: { item: WaitingItem; id: string }[] = [];
  for (const item of items) {
    const due = reminderDue(item, now);
    if (!due) continue;
    const id = `${item.key}_${item.since}_${due.stage}_${audience}`;
    if (await claim(db, id, now.toISOString())) claimed.push({ item, id });
  }
  return claimed;
}

export async function runWaitingSweep(db: Firestore, now: Date, mail: StaffMail): Promise<WaitingSweepResult> {
  const items = waitingOnClinician(await loadWaitingStore(db));
  const result: WaitingSweepResult = { waiting: items.length, emails: 0 };
  await refreshWaitingSince(db, items);
  if (!isSendingHour(now) || !items.length) return result;

  const memberIds = [...new Set(items.map((i) => i.memberId))];
  const members = await Promise.all(memberIds.map((id) => db.doc(`members/${id}`).get()));
  const names = new Map(members.map((m) => [m.id, `${(m.data() as MemberRecord | undefined)?.firstName ?? ''} ${(m.data() as MemberRecord | undefined)?.lastName ?? ''}`.trim() || 'A member']));
  const line = (i: WaitingItem) => `- ${names.get(i.memberId)}: ${WAITING_LABEL[i.kind]}, waiting ${waitedLabel(workingHours(i.since, now))}`;
  const footer = ['', `Open your workspace: ${SITE}/app`, '', 'For privacy, health details are only in the workspace, never in email.'];

  const assignments = await db.collection('providerAssignments').where('active', '==', true).limit(SWEEP_LIMIT).get();
  const clinicians = new Map<string, Set<string>>();
  for (const a of assignments.docs) clinicians.set(a.get('clinicianId'), (clinicians.get(a.get('clinicianId')) ?? new Set()).add(a.get('memberId')));

  for (const [clinicianId, assigned] of clinicians) {
    const theirs = items.filter((i) => assigned.has(i.memberId));
    if (!theirs.length) continue;
    const email = (await db.doc(`users/${clinicianId}`).get()).get('email') as string | undefined;
    if (!email) continue;
    const reminders = await claimAll(db, theirs, clinicianId, now);
    // The first run of the day is the morning summary, and it includes any reminders that have come due.
    const summaryId = `summary_${localDate(now)}_${clinicianId}`;
    const morning = await claim(db, summaryId, now.toISOString());
    if (!morning && !reminders.length) continue;
    const listed = morning ? theirs : reminders.map((r) => r.item);
    result.emails += await sendClaimed(
      db,
      [...reminders.map((r) => r.id), ...(morning ? [summaryId] : [])],
      mail,
      [email],
      `${morning ? '' : 'Reminder: '}${listed.length} waiting for your review`,
      [morning ? 'Good morning. These are waiting for you, longest first:' : 'A reminder that these are still waiting for you:', '', ...listed.map(line), ...footer].join('\n'),
    );
  }

  const overdue = items.filter((i) => reminderDue(i, now)?.tellAdmin);
  const alerts = await claimAll(db, overdue, 'admin', now);
  if (alerts.length) {
    result.emails += await sendClaimed(
      db,
      alerts.map((a) => a.id),
      mail,
      await mail.adminEmails(),
      `Waiting too long: ${alerts.length} with the clinician`,
      ['These have not been answered in time. The clinician has been reminded as well.', '', ...alerts.map((a) => line(a.item)), '', `The full list is on your admin page: ${SITE}/app`].join('\n'),
    );
  }
  return result;
}
