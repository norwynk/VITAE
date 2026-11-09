import type { Firestore } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWaitingSweep } from '../functions/src/waiting';
import { DEMO_ESTABLISHED_MEMBER, createFixtureStore, demoActor } from '../src/domain/fixtures';
import { type Message, type MessageThread, type OperationalProfile, type Store, type TreatmentRequest, visible } from '../src/domain/model';
import { journeyStage } from '../src/domain/journey';
import { byAttention, isOverdue, isSendingHour, isSummaryHour, waitingOnClinician, workingHours } from '../src/domain/waiting';

// Times are UTC; South Africa is two hours ahead.
const MON_10 = '2026-11-02T08:00:00.000Z';
const FRI_16 = '2026-11-06T14:00:00.000Z';
const at = (iso: string) => new Date(iso);
const request = (id: string, createdAt: string, extra: Partial<TreatmentRequest> = {}): TreatmentRequest => ({
  id,
  memberId: 'm1',
  treatmentId: 't1',
  status: 'OPEN',
  reason: '',
  createdAt,
  ...extra,
});
const thread = (id: string, extra: Partial<MessageThread> = {}): MessageThread => ({
  id,
  memberId: 'm1',
  topic: 'GENERAL',
  subject: '',
  escalated: false,
  createdAt: MON_10,
  lastMessageAt: MON_10,
  ...extra,
});
const message = (id: string, threadId: string, authorRole: Message['authorRole'], createdAt: string): Message => ({
  id,
  threadId,
  memberId: 'm1',
  topic: 'GENERAL',
  authorId: 'x',
  authorRole,
  body: 'private words',
  createdAt,
});

const call = (outcome: 'SPOKE' | 'NO_ANSWER', calledAt: string) => ({ id: `c_${calledAt}`, memberId: 'm1', clinicianId: 'dr', outcome, calledAt });

function storeWith(parts: Partial<Pick<Store, 'treatmentRequests' | 'messageThreads' | 'messages' | 'healthAssessments' | 'phoneCalls'>>): Store {
  const s = createFixtureStore();
  s.treatmentRequests = {};
  s.messageThreads = {};
  s.messages = {};
  s.healthAssessments = {};
  return { ...s, ...parts };
}

describe('the waiting clock', () => {
  it('does not count weekends', () => {
    expect(workingHours(FRI_16, at('2026-11-07T14:00:00.000Z'))).toBe(8); // Saturday 16:00: only Friday's last 8 hours
    expect(workingHours(FRI_16, at('2026-11-08T21:59:00.000Z'))).toBe(8); // Sunday night, still 8
    expect(workingHours(FRI_16, at('2026-11-09T14:00:00.000Z'))).toBe(24); // Monday 16:00 is one working day
    expect(workingHours(FRI_16, at('2026-11-10T14:00:00.000Z'))).toBe(48); // Tuesday 16:00 is two
  });

  it('only emails staff on weekdays between 07:00 and 19:00', () => {
    expect(isSendingHour(at('2026-11-09T05:00:00.000Z'))).toBe(true); // Monday 07:00
    expect(isSendingHour(at('2026-11-09T04:59:00.000Z'))).toBe(false);
    expect(isSendingHour(at('2026-11-09T17:00:00.000Z'))).toBe(false); // Monday 19:00
    expect(isSendingHour(at('2026-11-07T08:00:00.000Z'))).toBe(false); // Saturday
    expect(isSendingHour(at('2026-11-08T08:00:00.000Z'))).toBe(false); // Sunday
  });

  it('keeps the once-a-day emails to the start of a weekday', () => {
    expect(isSummaryHour(at('2026-11-09T05:00:00.000Z'))).toBe(true); // Monday 07:00
    expect(isSummaryHour(at('2026-11-09T07:59:00.000Z'))).toBe(true); // Monday 09:59
    expect(isSummaryHour(at('2026-11-09T08:00:00.000Z'))).toBe(false); // Monday 10:00
    expect(isSummaryHour(at('2026-11-07T05:00:00.000Z'))).toBe(false); // Saturday
  });

  it('calls a request overdue after two working days and an urgent message after four working hours', () => {
    const item = { key: 'req_1', memberId: 'm1', kind: 'REQUEST' as const, since: MON_10 };
    expect(isOverdue(item, at('2026-11-04T07:59:00.000Z'))).toBe(false);
    expect(isOverdue(item, at('2026-11-04T08:00:00.000Z'))).toBe(true);
    const urgent = { ...item, kind: 'URGENT' as const };
    expect(isOverdue(urgent, at('2026-11-02T11:59:00.000Z'))).toBe(false);
    expect(isOverdue(urgent, at('2026-11-02T12:00:00.000Z'))).toBe(true);
  });
});

describe('what counts as waiting', () => {
  it('counts open requests and stops once decided', () => {
    expect(waitingOnClinician(storeWith({ treatmentRequests: { r1: request('r1', MON_10) } }))).toHaveLength(1);
    expect(waitingOnClinician(storeWith({ treatmentRequests: { r1: request('r1', MON_10, { status: 'APPROVED' }) } }))).toHaveLength(0);
  });

  it('pauses "needs information" until the member responds', () => {
    const r1 = request('r1', MON_10, { status: 'NEEDS_INFORMATION', reviewedAt: '2026-11-03T08:00:00.000Z' });
    expect(waitingOnClinician(storeWith({ treatmentRequests: { r1 } }))).toHaveLength(0);
    const reply = message('a', 't1', 'MEMBER', '2026-11-04T09:00:00.000Z');
    const [item] = waitingOnClinician(storeWith({ treatmentRequests: { r1 }, messageThreads: { t1: thread('t1') }, messages: { a: reply } })).filter((i) => i.kind === 'REQUEST');
    expect(item.since).toBe(reply.createdAt);
  });

  it('counts a message until staff answer, from the first unanswered one', () => {
    const messages = { a: message('a', 't1', 'MEMBER', MON_10), b: message('b', 't1', 'MEMBER', FRI_16) };
    const [item] = waitingOnClinician(storeWith({ messageThreads: { t1: thread('t1') }, messages }));
    expect(item).toMatchObject({ kind: 'MESSAGE', since: MON_10 });
    const answered = { ...messages, c: message('c', 't1', 'CLINICIAN', '2026-11-07T08:00:00.000Z') };
    expect(waitingOnClinician(storeWith({ messageThreads: { t1: thread('t1') }, messages: answered }))).toHaveLength(0);
  });

  it('treats a phone call as answering what was sent before it, but not what comes after', () => {
    const urgent = { t1: thread('t1', { topic: 'SIDE_EFFECT_CONCERN', escalated: true }) };
    const a = message('a', 't1', 'MEMBER', MON_10);
    const later = '2026-11-02T10:00:00.000Z';
    expect(waitingOnClinician(storeWith({ messageThreads: urgent, messages: { a }, phoneCalls: { c: call('NO_ANSWER', later) } }))).toHaveLength(1);
    const spoke = { c: call('SPOKE', later) };
    expect(waitingOnClinician(storeWith({ messageThreads: urgent, messages: { a }, phoneCalls: spoke }))).toHaveLength(0);
    const b = message('b', 't1', 'MEMBER', '2026-11-02T11:00:00.000Z');
    expect(waitingOnClinician(storeWith({ messageThreads: urgent, messages: { a, b }, phoneCalls: spoke }))[0]).toMatchObject({ kind: 'URGENT', since: b.createdAt });
  });

  it('keeps a pen request open after the call, marked as spoken to, until the decision is recorded', () => {
    const later = '2026-11-02T10:00:00.000Z';
    const [item] = waitingOnClinician(storeWith({ treatmentRequests: { r1: request('r1', MON_10) }, phoneCalls: { c: call('SPOKE', later) } }));
    expect(item).toMatchObject({ kind: 'REQUEST', since: MON_10, spokenAt: later });
    const [missed] = waitingOnClinician(storeWith({ treatmentRequests: { r1: request('r1', MON_10) }, phoneCalls: { c: call('NO_ANSWER', later) } }));
    expect(missed.spokenAt).toBeUndefined();
  });

  it('marks side-effect concerns urgent and leaves delivery questions to operations', () => {
    const messages = { a: message('a', 't1', 'MEMBER', MON_10), b: message('b', 't2', 'MEMBER', MON_10) };
    const threads = { t1: thread('t1', { topic: 'SIDE_EFFECT_CONCERN', escalated: true }), t2: thread('t2', { topic: 'ORDER_DELIVERY' }) };
    expect(waitingOnClinician(storeWith({ messageThreads: threads, messages })).map((i) => i.kind)).toEqual(['URGENT']);
  });

  it('puts anyone waiting first when a workspace is full', () => {
    const p = (id: string, lastActivityAt: string, waitingSince?: string) => ({ id, memberId: id, lastActivityAt, waitingSince }) as OperationalProfile;
    const sorted = [p('active', '2026-11-08'), p('newer', '2026-01-01', '2026-11-02'), p('older', '2026-01-01', '2026-11-01')].sort(byAttention);
    expect(sorted.map((x) => x.id)).toEqual(['older', 'newer', 'active']);
  });
});

describe('the prick tracker', () => {
  const base = { requestId: 'r1', treatmentId: 't1', requestedAt: MON_10, moreInfoAsked: false, missedCalls: 0 };
  const WED_11 = at('2026-11-04T09:00:00.000Z');
  const stage = (extra: object, now = at('2026-11-02T12:00:00.000Z')) => journeyStage({ ...base, ...extra }, now);

  it('says whose move it is at each step', () => {
    expect(stage({})).toMatchObject({ label: 'Doctor to call', who: 'Doctor', late: false, open: true });
    expect(stage({ missedCalls: 2 })).toMatchObject({ label: 'Doctor tried calling (2), no answer', who: 'Doctor' });
    expect(stage({ spokenAt: MON_10 })).toMatchObject({ label: 'Spoken to, decision not recorded', who: 'Doctor' });
    expect(stage({ moreInfoAsked: true })).toMatchObject({ label: 'More information requested', who: 'Member' });
    expect(stage({ decidedAt: MON_10 })).toMatchObject({ label: 'Decision recorded', open: false });
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10 })).toMatchObject({ label: 'Pen to send', who: 'Team', open: true });
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10, sentAt: MON_10 })).toMatchObject({ label: 'Pen sent', open: false });
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10, sentAt: MON_10, followUpDue: '2026-11-30' })).toMatchObject({ label: 'Pen sent, follow-up due 2026-11-30', who: 'Doctor', open: true });
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10, sentAt: MON_10, followUpDue: '2026-11-30', followUpDoneAt: '2026-11-30T08:00:00.000Z' })).toMatchObject({ label: 'Follow-up done', open: false });
  });

  it('flags what has gone past its target', () => {
    expect(stage({}, WED_11).late).toBe(true);
    expect(stage({ spokenAt: MON_10 }, WED_11).late).toBe(true);
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10 }, at('2026-11-03T07:59:00.000Z')).late).toBe(false);
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10 }, at('2026-11-03T08:00:00.000Z')).late).toBe(true);
    expect(stage({ decidedAt: MON_10, approvedAt: MON_10, sentAt: MON_10, followUpDue: '2026-11-03' }, WED_11)).toMatchObject({ label: 'Follow-up overdue since 2026-11-03', late: true });
  });

  it('gives the admin dates only, never what was decided or said', () => {
    const s = createFixtureStore();
    const id = DEMO_ESTABLISHED_MEMBER.uid;
    s.treatmentRequests = { r9: { ...request('r9', MON_10, { status: 'DECLINED', reviewedAt: FRI_16, decisionNote: 'private reason' }), memberId: id } };
    s.phoneCalls = { c: { ...call('SPOKE', '2026-11-03T08:00:00.000Z'), memberId: id }, d: { ...call('NO_ANSWER', '2026-11-02T09:00:00.000Z'), memberId: id } };
    const seen = visible(s, demoActor('SUPER_ADMIN'));
    expect(seen.members[id].penJourneys).toEqual([{ requestId: 'r9', treatmentId: 't1', requestedAt: MON_10, moreInfoAsked: false, missedCalls: 1, spokenAt: '2026-11-03T08:00:00.000Z', decidedAt: FRI_16 }]);
    expect(JSON.stringify(seen)).not.toContain('private reason');
    expect(JSON.stringify(seen.members[id])).not.toContain('DECLINED');
  });
});

describe('what the admin can see', () => {
  it('shows contact details and nothing more', () => {
    const store = createFixtureStore();
    const seen = visible(store, demoActor('SUPER_ADMIN')).members[DEMO_ESTABLISHED_MEMBER.uid];
    expect(seen.email).toBe(store.members[DEMO_ESTABLISHED_MEMBER.uid].email);
    expect(seen.phone).toBe(store.members[DEMO_ESTABLISHED_MEMBER.uid].phone);
    expect(Object.keys(seen).sort()).toEqual(['createdAt', 'email', 'firstName', 'id', 'lastName', 'memberId', 'onboardedAt', 'penJourneys', 'pensPicked', 'phone', 'updatedAt']);
    expect(visible(store, demoActor('SUPER_ADMIN')).medicalHistories).toEqual({});
  });

  it('shows which pens someone picked, once each, but not what the clinician decided', () => {
    const uid = DEMO_ESTABLISHED_MEMBER.uid;
    const store = createFixtureStore();
    store.treatmentRequests = {
      b: request('b', FRI_16, { memberId: uid, treatmentId: 'trt-the-glow-up', status: 'DECLINED', decisionNote: 'private reason' }),
      a: request('a', MON_10, { memberId: uid, treatmentId: 'trt-sharp-mind' }),
      c: request('c', FRI_16, { memberId: uid, treatmentId: 'trt-sharp-mind', status: 'APPROVED' }),
      other: request('other', MON_10, { memberId: 'someone-else', treatmentId: 'trt-gut-reset' }),
    };
    const seen = visible(store, demoActor('SUPER_ADMIN'));
    expect(seen.members[uid].pensPicked).toEqual(['trt-sharp-mind', 'trt-the-glow-up']);
    expect(seen.treatmentRequests).toEqual({});
    expect(JSON.stringify(seen.members)).not.toMatch(/private reason|DECLINED|APPROVED/);
  });

  it('still hides contact details from operations', () => {
    expect(visible(createFixtureStore(), demoActor('OPERATIONS')).members).toEqual({});
  });
});

/** Just enough Firestore for the sweep. */
function fakeDb(data: Record<string, Record<string, Record<string, unknown>>>) {
  const docRef = (collection: string, id: string) => ({
    id,
    get exists() {
      return Boolean(data[collection]?.[id]);
    },
    get: async () => snapshot(collection, id),
    create: async (value: Record<string, unknown>) => {
      if (data[collection]?.[id]) throw Object.assign(new Error('exists'), { code: 6 });
      (data[collection] ??= {})[id] = value;
    },
    delete: async () => {
      delete data[collection]?.[id];
    },
    update: async (value: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(value)) {
        if ((v as object).constructor.name === 'DeleteTransform') delete data[collection][id][k];
        else data[collection][id][k] = v;
      }
    },
  });
  const snapshot = (collection: string, id: string) => ({
    id,
    ref: docRef(collection, id),
    exists: Boolean(data[collection]?.[id]),
    data: () => data[collection]?.[id],
    get: (field: string) => data[collection]?.[id]?.[field],
  });
  const query = (collection: string, filters: ((d: Record<string, unknown>) => boolean)[] = []) => ({
    where: (field: string, op: string, value: unknown) =>
      query(collection, [
        ...filters,
        (d) => (op === 'in' ? (value as unknown[]).includes(d[field]) : op === '>' ? typeof d[field] === 'string' && (d[field] as string) > (value as string) : d[field] === value),
      ]),
    orderBy: () => query(collection, filters),
    limit: () => query(collection, filters),
    get: async () => ({ docs: Object.keys(data[collection] ?? {}).filter((id) => filters.every((f) => f(data[collection][id]))).map((id) => snapshot(collection, id)) }),
  });
  return {
    collection: query,
    doc: (path: string) => docRef(path.split('/')[0], path.split('/')[1]),
  } as unknown as Firestore;
}

describe('the hourly reminder sweep', () => {
  let data: Record<string, Record<string, Record<string, unknown>>>;
  const clinicianMail = 'clinician@example.invalid';
  const adminMail = 'admin@example.invalid';
  const send = vi.fn(async (..._args: [string[], string, string]) => {});
  const mail = { send, adminEmails: async () => [adminMail] };
  const sweep = (iso: string) => runWaitingSweep(fakeDb(data), at(iso), mail);
  const to = (email: string) => send.mock.calls.filter(([recipients]) => recipients.includes(email));

  beforeEach(() => {
    send.mockReset();
    send.mockImplementation(async () => {});
    data = {
      treatmentRequests: { r1: { ...request('r1', MON_10) } },
      members: { m1: { firstName: 'Sam', lastName: 'Example' } },
      operationalProfiles: { m1: { memberId: 'm1' } },
      providerAssignments: { a1: { clinicianId: 'c1', memberId: 'm1', active: true } },
      users: { c1: { email: clinicianMail } },
    };
  });

  it('sends the morning summary once a day', async () => {
    await sweep('2026-11-02T05:20:00.000Z');
    await sweep('2026-11-02T06:20:00.000Z');
    expect(to(clinicianMail)).toHaveLength(1);
    expect(to(clinicianMail)[0][2]).toContain('Sam Example: pen request');
  });

  it('emails the clinician once a day however long it waits, and the admin once a day from two working days', async () => {
    const day = async (date: string) => {
      for (const time of ['05:20', '06:20', '08:20', '12:20', '16:20']) await sweep(`${date}T${time}:00.000Z`);
    };
    await day('2026-11-03'); // about one working day
    expect(to(clinicianMail)).toHaveLength(1);
    expect(to(adminMail)).toHaveLength(0);
    await day('2026-11-04'); // two working days pass mid-morning, after the morning email
    expect(to(clinicianMail)).toHaveLength(2);
    expect(to(adminMail)).toHaveLength(0);
    await day('2026-11-05');
    expect(to(clinicianMail)).toHaveLength(3);
    expect(to(adminMail)).toHaveLength(1);
    expect(to(adminMail)[0][2]).toContain('Sam Example');
  });

  it('does not email anyone about something that arrives later in the day', async () => {
    data.treatmentRequests.r1.createdAt = '2026-11-02T11:00:00.000Z';
    await sweep('2026-11-02T12:20:00.000Z');
    await sweep('2026-11-02T15:20:00.000Z');
    expect(send).not.toHaveBeenCalled();
  });

  it('tells only the admin about an unanswered urgent message, once, then lists it in the morning', async () => {
    data.treatmentRequests = {};
    data.messageThreads = { t1: { ...thread('t1', { topic: 'SIDE_EFFECT_CONCERN', escalated: true }) } };
    data.messages = { a: { ...message('a', 't1', 'MEMBER', MON_10) } };
    await sweep('2026-11-02T12:20:00.000Z'); // over four working hours
    await sweep('2026-11-02T13:20:00.000Z');
    await sweep('2026-11-02T16:20:00.000Z');
    expect(to(adminMail)).toHaveLength(1);
    expect(to(clinicianMail)).toHaveLength(0);
    await sweep('2026-11-03T05:20:00.000Z');
    await sweep('2026-11-03T12:20:00.000Z');
    expect(to(adminMail)).toHaveLength(2);
    expect(to(clinicianMail)).toHaveLength(1);
  });

  it('sends nothing at the weekend but keeps the admin list right', async () => {
    await sweep('2026-11-07T08:00:00.000Z');
    expect(send).not.toHaveBeenCalled();
    expect(data.operationalProfiles.m1.waitingSince).toBe(MON_10);
  });

  it('clears the admin list once answered', async () => {
    data.operationalProfiles.m1.waitingSince = MON_10;
    data.treatmentRequests.r1.status = 'APPROVED';
    await sweep('2026-11-03T08:00:00.000Z');
    expect(data.operationalProfiles.m1.waitingSince).toBeUndefined();
  });

  it('tries again next hour if the email fails', async () => {
    send.mockRejectedValueOnce(new Error('Gmail down'));
    await sweep('2026-11-03T05:20:00.000Z');
    await sweep('2026-11-03T06:20:00.000Z');
    expect(to(clinicianMail)).toHaveLength(2);
  });

  it('never puts message text or the pen in an email', async () => {
    data.messageThreads = { t1: { ...thread('t1') } };
    data.messages = { a: { ...message('a', 't1', 'MEMBER', MON_10) } };
    await sweep('2026-11-05T05:20:00.000Z');
    expect(send).toHaveBeenCalled();
    for (const [, subject, text] of send.mock.calls) expect(`${subject} ${text}`).not.toContain('private words');
  });

});
