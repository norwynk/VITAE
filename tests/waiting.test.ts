import type { Firestore } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWaitingSweep } from '../functions/src/waiting';
import { DEMO_ESTABLISHED_MEMBER, createFixtureStore, demoActor } from '../src/domain/fixtures';
import { type Message, type MessageThread, type OperationalProfile, type Store, type TreatmentRequest, visible } from '../src/domain/model';
import { byAttention, isSendingHour, reminderDue, waitingOnClinician, workingHours } from '../src/domain/waiting';

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

function storeWith(parts: Partial<Pick<Store, 'treatmentRequests' | 'messageThreads' | 'messages' | 'healthAssessments'>>): Store {
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

  it('reminds the clinician after a working day and the admin too after two', () => {
    const item = { key: 'req_1', memberId: 'm1', kind: 'REQUEST' as const, since: MON_10 };
    expect(reminderDue(item, at('2026-11-03T07:59:00.000Z'))).toBeNull();
    expect(reminderDue(item, at('2026-11-03T08:00:00.000Z'))).toEqual({ stage: 1, tellAdmin: false });
    expect(reminderDue(item, at('2026-11-04T08:00:00.000Z'))).toEqual({ stage: 2, tellAdmin: true });
    expect(reminderDue(item, at('2026-11-05T08:00:00.000Z'))).toEqual({ stage: 3, tellAdmin: true });
  });

  it('tells the admin about an urgent message after four working hours', () => {
    const item = { key: 'msg_1', memberId: 'm1', kind: 'URGENT' as const, since: MON_10 };
    expect(reminderDue(item, at('2026-11-02T11:59:00.000Z'))).toBeNull();
    expect(reminderDue(item, at('2026-11-02T12:00:00.000Z'))).toEqual({ stage: 1, tellAdmin: true });
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

describe('what the admin can see', () => {
  it('shows contact details and nothing more', () => {
    const store = createFixtureStore();
    const seen = visible(store, demoActor('SUPER_ADMIN')).members[DEMO_ESTABLISHED_MEMBER.uid];
    expect(seen.email).toBe(store.members[DEMO_ESTABLISHED_MEMBER.uid].email);
    expect(seen.phone).toBe(store.members[DEMO_ESTABLISHED_MEMBER.uid].phone);
    expect(Object.keys(seen).sort()).toEqual(['createdAt', 'email', 'firstName', 'id', 'lastName', 'memberId', 'onboardedAt', 'pensPicked', 'phone', 'updatedAt']);
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
    await sweep('2026-11-02T09:00:00.000Z');
    await sweep('2026-11-02T10:00:00.000Z');
    expect(to(clinicianMail)).toHaveLength(1);
    expect(to(clinicianMail)[0][2]).toContain('Sam Example: pen request');
  });

  it('reminds the clinician at one working day, then the admin as well at two, once each', async () => {
    await sweep('2026-11-03T05:00:00.000Z'); // Tuesday morning summary, not yet a day
    await sweep('2026-11-03T08:00:00.000Z'); // one working day
    await sweep('2026-11-03T09:00:00.000Z'); // nothing new
    expect(to(clinicianMail)).toHaveLength(2);
    expect(to(adminMail)).toHaveLength(0);
    await sweep('2026-11-04T05:00:00.000Z'); // Wednesday morning summary
    await sweep('2026-11-04T08:00:00.000Z'); // two working days
    await sweep('2026-11-04T09:00:00.000Z');
    expect(to(clinicianMail)).toHaveLength(4);
    expect(to(adminMail)).toHaveLength(1);
    expect(to(adminMail)[0][2]).toContain('Sam Example');
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
    await sweep('2026-11-03T08:00:00.000Z');
    await sweep('2026-11-03T09:00:00.000Z');
    expect(to(clinicianMail)).toHaveLength(2);
  });

  it('never puts message text or the pen in an email', async () => {
    data.messageThreads = { t1: { ...thread('t1') } };
    data.messages = { a: { ...message('a', 't1', 'MEMBER', MON_10) } };
    await sweep('2026-11-05T08:00:00.000Z');
    expect(send).toHaveBeenCalled();
    for (const [, subject, text] of send.mock.calls) expect(`${subject} ${text}`).not.toContain('private words');
  });

});
