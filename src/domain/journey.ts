/**
 * Where a pen has got to and whose move it is. Dates only: nothing here says
 * what anyone answered, said or decided.
 */
import { type PenJourney, localDate } from './model';
import { OVERDUE_HOURS, workingHours } from './waiting';

/** An approved pen should go out within one working day. */
export const SEND_HOURS = 24;
/** A sent pen with no confirmation after three working days needs chasing. */
export const DELIVERY_HOURS = 72;

export interface JourneyStage {
  label: string;
  who?: 'Doctor' | 'Team' | 'Member';
  late: boolean;
  open: boolean;
}

export function journeyStage(j: PenJourney, now: Date): JourneyStage {
  if (j.moreInfoAsked) return { label: 'More information requested', who: 'Member', late: false, open: true };
  if (!j.decidedAt) {
    const late = workingHours(j.requestedAt, now) >= OVERDUE_HOURS;
    if (j.spokenAt) return { label: 'Spoken to, decision not recorded', who: 'Doctor', late, open: true };
    return { label: j.missedCalls ? `Doctor tried calling (${j.missedCalls}), no answer` : 'Doctor to call', who: 'Doctor', late, open: true };
  }
  if (!j.approvedAt) return { label: 'Decision recorded', late: false, open: false };
  if (!j.sentAt) return { label: 'Pen to send', who: 'Team', late: workingHours(j.approvedAt, now) >= SEND_HOURS, open: true };
  if (j.followUpDoneAt) return { label: 'Follow-up done', late: false, open: false };
  if (!j.deliveredAt) return { label: 'Pen sent, delivery not confirmed', who: 'Team', late: workingHours(j.sentAt, now) >= DELIVERY_HOURS, open: true };
  if (!j.followUpDue) return { label: 'Pen delivered', late: false, open: false };
  return localDate(now) > j.followUpDue
    ? { label: `Follow-up overdue since ${j.followUpDue}`, who: 'Doctor', late: true, open: true }
    : { label: `Pen delivered, follow-up due ${j.followUpDue}`, who: 'Doctor', late: false, open: true };
}
