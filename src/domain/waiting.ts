/**
 * What is waiting on the clinician and how long it has waited. Weekends do
 * not count: the clock stops on Friday at midnight and starts again on Monday.
 */
import { type OperationalProfile, type Store, type TreatmentRequest, PENDING_REQUEST_STATUSES } from './model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// South Africa has one time zone and no daylight saving.
const SA_OFFSET = 2 * HOUR;

/** A pen reminder goes out for every full working day waited; from the second, the admin hears too. */
const REMINDER_EVERY_HOURS = 24;
const TELL_ADMIN_FROM_STAGE = 2;
const URGENT_HOURS = 4;
export const OVERDUE_HOURS = 48;

const isWeekday = (saTime: number) => ![0, 6].includes(new Date(saTime).getUTCDay());

/** Hours between two moments, leaving out Saturdays and Sundays in South Africa. */
export function workingHours(from: string, to: Date): number {
  let t = Date.parse(from) + SA_OFFSET;
  const end = to.getTime() + SA_OFFSET;
  let ms = 0;
  while (t < end) {
    const midnight = (Math.floor(t / DAY) + 1) * DAY;
    if (isWeekday(t)) ms += Math.min(midnight, end) - t;
    t = midnight;
  }
  return ms / HOUR;
}

/** Staff reminders only go out on weekdays, 07:00 to 19:00. */
export function isSendingHour(now: Date): boolean {
  const t = now.getTime() + SA_OFFSET;
  const hour = new Date(t).getUTCHours();
  return isWeekday(t) && hour >= 7 && hour < 19;
}

export function waitedLabel(hours: number): string {
  if (hours < 1) return 'under an hour';
  const [n, unit] = hours < 24 ? [Math.floor(hours), 'working hour'] : [Math.floor(hours / 24), 'working day'];
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

export interface WaitingItem {
  key: string;
  memberId: string;
  kind: 'REQUEST' | 'MESSAGE' | 'URGENT';
  since: string;
}

export const WAITING_LABEL: Record<WaitingItem['kind'], string> = { REQUEST: 'pen request', MESSAGE: 'message', URGENT: 'urgent message' };

/** "Needs information" waits on the member, so its clock starts when they next respond. */
function repliedAt(store: Store, request: TreatmentRequest): string | undefined {
  const after = request.reviewedAt ?? request.createdAt;
  return [
    ...Object.values(store.messages)
      .filter((m) => m.memberId === request.memberId && m.authorRole === 'MEMBER')
      .map((m) => m.createdAt),
    ...Object.values(store.healthAssessments)
      .filter((a) => a.memberId === request.memberId)
      .map((a) => a.completedAt),
  ]
    .filter((at) => at > after)
    .sort()[0];
}

/** Everything the clinician still has to answer, longest wait first. Order and delivery questions go to operations. */
export function waitingOnClinician(store: Store, memberId?: string): WaitingItem[] {
  const items: WaitingItem[] = [];
  for (const r of Object.values(store.treatmentRequests)) {
    if ((memberId && r.memberId !== memberId) || !PENDING_REQUEST_STATUSES.includes(r.status)) continue;
    const since = r.status === 'NEEDS_INFORMATION' ? repliedAt(store, r) : r.createdAt;
    if (since) items.push({ key: `req_${r.id}`, memberId: r.memberId, kind: 'REQUEST', since });
  }
  const messages = Object.values(store.messages).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const t of Object.values(store.messageThreads)) {
    if ((memberId && t.memberId !== memberId) || t.topic === 'ORDER_DELIVERY') continue;
    const thread = messages.filter((m) => m.threadId === t.id);
    const unanswered = thread.slice(thread.map((m) => m.authorRole !== 'MEMBER').lastIndexOf(true) + 1);
    if (unanswered.length) items.push({ key: `msg_${t.id}`, memberId: t.memberId, kind: t.escalated ? 'URGENT' : 'MESSAGE', since: unanswered[0].createdAt });
  }
  return items.sort((a, b) => a.since.localeCompare(b.since));
}

/** Which reminder this item has reached, if any. Each stage is sent once. */
export function reminderDue(item: WaitingItem, now: Date): { stage: number; tellAdmin: boolean } | null {
  const hours = workingHours(item.since, now);
  if (item.kind === 'URGENT') return hours < URGENT_HOURS ? null : { stage: 1 + Math.floor(hours / REMINDER_EVERY_HOURS), tellAdmin: true };
  const stage = Math.floor(hours / REMINDER_EVERY_HOURS);
  return stage ? { stage, tellAdmin: stage >= TELL_ADMIN_FROM_STAGE } : null;
}

/** Who to load first when a clinician has more members than one workspace holds: anyone waiting, then the most recently active. */
export function byAttention(a: OperationalProfile, b: OperationalProfile): number {
  if (a.waitingSince && b.waitingSince) return a.waitingSince.localeCompare(b.waitingSince);
  if (a.waitingSince || b.waitingSince) return a.waitingSince ? -1 : 1;
  return b.lastActivityAt.localeCompare(a.lastActivityAt);
}
