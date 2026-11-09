/**
 * What is waiting on the clinician and how long it has waited. Weekends do
 * not count: the clock stops on Friday at midnight and starts again on Monday.
 */
import { type OperationalProfile, type Store, type TreatmentRequest, PENDING_REQUEST_STATUSES } from './model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// South Africa has one time zone and no daylight saving.
const SA_OFFSET = 2 * HOUR;

/** Overdue means the admin hears: after two working days, or four working hours for an urgent message. */
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

function isWeekdayBetween(now: Date, fromHour: number, toHour: number): boolean {
  const t = now.getTime() + SA_OFFSET;
  const hour = new Date(t).getUTCHours();
  return isWeekday(t) && hour >= fromHour && hour < toHour;
}

/** No staff email goes out outside weekdays, 07:00 to 19:00. */
export const isSendingHour = (now: Date) => isWeekdayBetween(now, 7, 19);

/** The once-a-day emails go out at the start of the day; the extra hours are only there to retry a failed send. */
export const isSummaryHour = (now: Date) => isWeekdayBetween(now, 7, 10);

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
  /** A pen request where the call has happened but the decision hasn't been recorded. */
  spokenAt?: string;
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
  const lastSpoke = new Map<string, string>();
  for (const c of Object.values(store.phoneCalls)) {
    if (c.outcome === 'SPOKE' && c.calledAt > (lastSpoke.get(c.memberId) ?? '')) lastSpoke.set(c.memberId, c.calledAt);
  }
  for (const r of Object.values(store.treatmentRequests)) {
    if ((memberId && r.memberId !== memberId) || !PENDING_REQUEST_STATUSES.includes(r.status)) continue;
    const since = r.status === 'NEEDS_INFORMATION' ? repliedAt(store, r) : r.createdAt;
    if (!since) continue;
    const spokenAt = lastSpoke.get(r.memberId);
    items.push({ key: `req_${r.id}`, memberId: r.memberId, kind: 'REQUEST', since, ...(spokenAt && spokenAt >= since ? { spokenAt } : {}) });
  }
  const messages = Object.values(store.messages).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const t of Object.values(store.messageThreads)) {
    if ((memberId && t.memberId !== memberId) || t.topic === 'ORDER_DELIVERY') continue;
    const thread = messages.filter((m) => m.threadId === t.id);
    // A phone call answers whatever they had sent before it.
    const unanswered = thread.slice(thread.map((m) => m.authorRole !== 'MEMBER').lastIndexOf(true) + 1).filter((m) => m.createdAt > (lastSpoke.get(t.memberId) ?? ''));
    if (unanswered.length) items.push({ key: `msg_${t.id}`, memberId: t.memberId, kind: t.escalated ? 'URGENT' : 'MESSAGE', since: unanswered[0].createdAt });
  }
  return items.sort((a, b) => a.since.localeCompare(b.since));
}

export function isOverdue(item: WaitingItem, now: Date): boolean {
  return workingHours(item.since, now) >= (item.kind === 'URGENT' ? URGENT_HOURS : OVERDUE_HOURS);
}

/** Who to load first when a clinician has more members than one workspace holds: anyone waiting, then the most recently active. */
export function byAttention(a: OperationalProfile, b: OperationalProfile): number {
  if (a.waitingSince && b.waitingSince) return a.waitingSince.localeCompare(b.waitingSince);
  if (a.waitingSince || b.waitingSince) return a.waitingSince ? -1 : 1;
  return b.lastActivityAt.localeCompare(a.lastActivityAt);
}
