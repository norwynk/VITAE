/**
 * Reminder sweep, run every 15 minutes by `sendTreatmentReminders`.
 * Separated from the trigger so the emulator journey can exercise it.
 */
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import {
  type AdherenceEvent,
  type ApprovedTreatment,
  type NotificationRecord,
  type Regimen,
  type Reminder,
  NEUTRAL_SENDER_LABEL,
  localDate,
  reminderDecision,
} from '../../src/domain/model';

const ALREADY_EXISTS = 6;

export const REMINDER_TITLE = NEUTRAL_SENDER_LABEL;
/** Generic lock-screen text: never names the treatment or dose. */
export const REMINDER_BODY = 'You have a scheduled reminder. Open the app for details.';

export interface SweepResult {
  checked: number;
  created: number;
  pushed: number;
}

export async function runReminderSweep(
  db: Firestore,
  messaging: Pick<Messaging, 'sendEachForMulticast'> | null,
  now: Date,
): Promise<SweepResult> {
  const today = localDate(now);
  const result: SweepResult = { checked: 0, created: 0, pushed: 0 };
  const reminders = await db.collection('reminders').where('active', '==', true).limit(2000).get();

  for (const snap of reminders.docs) {
    result.checked += 1;
    const reminder = { ...snap.data(), id: snap.id } as Reminder;
    const [approvalSnap, regimenSnap, adherenceSnap] = await Promise.all([
      db.doc(`approvedTreatments/${reminder.approvalId}`).get(),
      db.doc(`regimens/${reminder.regimenId}`).get(),
      db
        .collection('adherenceEvents')
        .where('memberId', '==', reminder.memberId)
        .where('dueDate', '==', today)
        .get(),
    ]);
    const decision = reminderDecision({
      reminder,
      approval: approvalSnap.exists ? ({ ...approvalSnap.data(), id: approvalSnap.id } as ApprovedTreatment) : undefined,
      regimen: regimenSnap.exists ? ({ ...regimenSnap.data(), id: regimenSnap.id } as Regimen) : undefined,
      adherence: adherenceSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as AdherenceEvent),
      now,
    });
    if (!decision.send) continue;

    const notification: NotificationRecord = {
      id: decision.notificationId,
      memberId: reminder.memberId,
      kind: 'REMINDER',
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
      read: false,
      createdAt: now.toISOString(),
    };
    try {
      // Deterministic id + create(): a repeated sweep cannot duplicate it.
      await db.doc(`notifications/${decision.notificationId}`).create(notification);
    } catch (e) {
      if ((e as { code?: number }).code === ALREADY_EXISTS) continue;
      throw e;
    }
    result.created += 1;

    const tokens = ((await db.doc(`users/${reminder.memberId}`).get()).get('pushTokens') as string[] | undefined) ?? [];
    if (messaging && tokens.length) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: REMINDER_TITLE, body: REMINDER_BODY },
        data: { kind: 'REMINDER', notificationId: decision.notificationId },
      });
      result.pushed += 1;
    }
  }
  return result;
}
