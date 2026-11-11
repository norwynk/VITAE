/**
 * Hourly check for anything left waiting on the clinician. Only the admin is
 * emailed: one list each working morning of everything waiting, with anything
 * overdue marked late, plus a one-off note about an unanswered urgent message.
 * The clinician gets no reminder emails; the admin follows up with them.
 * Emails name people and waiting times only.
 */
import { FieldValue, type Firestore, type QuerySnapshot } from 'firebase-admin/firestore';
import { type CollectionName, type MemberRecord, type Store, PENDING_REQUEST_STATUSES, emptyStore, localDate } from '../../src/domain/model';
import { type WaitingItem, WAITING_LABEL, isOverdue, isSendingHour, isSummaryHour, waitedLabel, waitingOnClinician, workingHours } from '../../src/domain/waiting';

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
  const [requests, threads, messages, calls] = await Promise.all([
    db.collection('treatmentRequests').where('status', 'in', [...PENDING_REQUEST_STATUSES]).limit(SWEEP_LIMIT).get(),
    db.collection('messageThreads').orderBy('lastMessageAt', 'desc').limit(SWEEP_LIMIT).get(),
    db.collection('messages').orderBy('createdAt', 'desc').limit(SWEEP_LIMIT).get(),
    db.collection('phoneCalls').orderBy('calledAt', 'desc').limit(SWEEP_LIMIT).get(),
  ]);
  put(store, 'treatmentRequests', requests);
  put(store, 'messageThreads', threads);
  put(store, 'messages', messages);
  put(store, 'phoneCalls', calls);
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
    console.warn('Waiting reminder failed; will retry', e);
    await Promise.all(claims.map((id) => db.doc(`staffReminders/${id}`).delete()));
    return 0;
  }
}

/** Urgent messages lead each list; otherwise the longest wait comes first. */
const urgentFirst = (items: WaitingItem[]) => [...items.filter((i) => i.kind === 'URGENT'), ...items.filter((i) => i.kind !== 'URGENT')];

export async function runWaitingSweep(db: Firestore, now: Date, mail: StaffMail): Promise<WaitingSweepResult> {
  const items = waitingOnClinician(await loadWaitingStore(db));
  const result: WaitingSweepResult = { waiting: items.length, emails: 0 };
  await refreshWaitingSince(db, items);
  if (!isSendingHour(now) || !items.length) return result;

  const memberIds = [...new Set(items.map((i) => i.memberId))];
  const members = await Promise.all(memberIds.map((id) => db.doc(`members/${id}`).get()));
  const names = new Map(members.map((m) => [m.id, `${(m.data() as MemberRecord | undefined)?.firstName ?? ''} ${(m.data() as MemberRecord | undefined)?.lastName ?? ''}`.trim() || 'A member']));
  const line = (i: WaitingItem) => `- ${names.get(i.memberId)}: ${WAITING_LABEL[i.kind]}, waiting ${waitedLabel(workingHours(i.since, now))}${i.spokenAt ? ' (spoken to by phone, decision not recorded yet)' : ''}`;
  const adminFooter = ['', `The full list is on your admin page: ${SITE}/app`];

  const overdue = items.filter((i) => isOverdue(i, now));
  const urgentClaim = (i: WaitingItem) => `urgent_${i.key}_${i.since}`;

  if (isSummaryHour(now)) {
    const adminSummaryId = `admin_summary_${localDate(now)}`;
    if (await claim(db, adminSummaryId, now.toISOString())) {
      // Anything urgent on this list has now been flagged, so it gets no separate note.
      const flagged: string[] = [];
      for (const i of overdue) if (i.kind === 'URGENT' && (await claim(db, urgentClaim(i), now.toISOString()))) flagged.push(urgentClaim(i));
      const late = new Set(overdue.map((i) => i.key));
      result.emails += await sendClaimed(
        db,
        [adminSummaryId, ...flagged],
        mail,
        await mail.adminEmails(),
        `${items.length} waiting for the doctor${overdue.length ? `, ${overdue.length} late` : ''}`,
        [
          'Good morning. These are waiting for the doctor:',
          '',
          ...urgentFirst(items).map((i) => line(i) + (late.has(i.key) ? ' (late)' : '')),
          '',
          'The doctor is not emailed about these, so give them a nudge.',
          ...adminFooter,
        ].join('\n'),
      );
    }
    return result;
  }

  const newlyUrgent: WaitingItem[] = [];
  for (const i of overdue) if (i.kind === 'URGENT' && (await claim(db, urgentClaim(i), now.toISOString()))) newlyUrgent.push(i);
  if (newlyUrgent.length) {
    result.emails += await sendClaimed(
      db,
      newlyUrgent.map(urgentClaim),
      mail,
      await mail.adminEmails(),
      `Urgent message not answered: ${newlyUrgent.length}`,
      ['An urgent message has not been answered yet:', '', ...newlyUrgent.map(line), ...adminFooter].join('\n'),
    );
  }
  return result;
}
