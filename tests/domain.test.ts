import { describe, expect, it } from 'vitest';
import {
  type CommandContext,
  type CommandInput,
  DomainError,
  applyCommand,
  diffStores,
  purchaseBlocks,
} from '../src/domain/commands';
import { DEMO_ESTABLISHED_MEMBER, DEMO_USERS, createFixtureStore, demoActor } from '../src/domain/fixtures';
import {
  type Actor,
  type Store,
  addDays,
  ageOn,
  isScheduledOn,
  localDate,
  localTime,
  reminderDecision,
  scheduledDates,
  visible,
} from '../src/domain/model';

const NOW = new Date('2026-10-06T08:30:00Z'); // 10:30 in Johannesburg
const TODAY = '2026-10-06';
const NEW = DEMO_USERS.MEMBER.uid;
const EST = DEMO_ESTABLISHED_MEMBER.uid;
const member = demoActor('MEMBER');
const established: Actor = { uid: EST, role: 'MEMBER' };
const clinician = demoActor('CLINICIAN');
const ops = demoActor('OPERATIONS');
const admin = demoActor('SUPER_ADMIN');
const fulfilment = demoActor('FULFILMENT');
const corporate = demoActor('CORPORATE_ADMIN');
const otherClinician: Actor = { uid: 'other-clinician', role: 'CLINICIAN' };

// Shared across calls so ids never collide between commands, as in production.
let idCounter = 0;
function ctx(mode: 'demo' | 'live' = 'demo', now = NOW): CommandContext {
  return { now, mode, newId: (p) => `${p}_${++idCounter}` };
}

function run(store: Store, actor: Actor, command: CommandInput, mode: 'demo' | 'live' = 'demo', now = NOW) {
  return applyCommand(store, actor, command, ctx(mode, now));
}

function expectError(fn: () => unknown, code: DomainError['code'], message?: RegExp) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    if (message) expect((e as DomainError).message).toMatch(message);
    return;
  }
  throw new Error('Expected a DomainError');
}

const address = {
  recipient: 'Alex Demo',
  line1: '1 Example Street',
  suburb: 'Demo',
  city: 'Cape Town',
  province: 'Western Cape' as const,
  postalCode: '8001',
  phone: '+27 21 000 0000',
};

function onboardCommand(overrides: Record<string, unknown> = {}): CommandInput {
  return {
    type: 'onboard',
    profile: {
      firstName: 'Alex',
      lastName: 'Demo',
      dateOfBirth: '1990-01-15',
      identity: { type: 'SA_ID', number: '9001155000080' },
      phone: '+27 82 000 0000',
      province: 'Western Cape',
      city: 'Cape Town',
    },
    body: { heightCm: 175, weightKg: 82 },
    goals: { goals: ['Energy'], motivation: 'Feel better' },
    health: { conditions: [], medications: '', allergies: '', pregnancyOrBreastfeeding: false, previousPeptideUse: false, notes: '' },
    lifestyle: { activityLevel: 'MODERATE', sleepHours: 7, smoking: false, alcoholUnitsPerWeek: 2, diet: 'Mixed' },
    testingInterest: true,
    consents: { privacy: true, terms: true, healthData: true, clinicalService: true, communications: false, marketing: false },
    ...overrides,
  } as CommandInput;
}

function onboarded(): Store {
  return run(createFixtureStore(NOW), member, onboardCommand()).store;
}

function approvalPlan(overrides: Record<string, unknown> = {}) {
  return {
    quantity: 2,
    dose: 1,
    doseUnit: 'click',
    schedule: { kind: 'DAILY' as const },
    startDate: TODAY,
    durationDays: 28,
    reminderTime: '08:00',
    instructions: 'Demo',
    ...overrides,
  };
}

/** New member onboarded, requested metabolic pen, clinician approved. */
function approved(mode: 'demo' | 'live' = 'demo') {
  let store = onboarded();
  const req = run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' }, mode);
  store = req.store;
  const rev = run(
    store,
    clinician,
    {
      type: 'review',
      requestId: req.resultId!,
      memberId: NEW,
      decision: 'APPROVED',
      note: 'Suitable',
      reviewDate: addDays(TODAY, 14),
      approval: approvalPlan(),
    },
    mode,
  );
  return { store: rev.store, requestId: req.resultId!, approvalId: rev.resultId! };
}

/** Super admin makes the metabolic pen orderable (fictional verification). */
function makePurchasable(store: Store): Store {
  return run(store, admin, {
    type: 'catalogue',
    treatmentId: 'trt-total-body-reset',
    changes: { regulatoryStatus: 'VERIFIED', regulatoryReference: 'DEMO-REG-0001', purchasable: true },
  }).store;
}

describe('dates and scheduling', () => {
  it('uses South African local dates', () => {
    expect(localDate(new Date('2026-10-05T22:30:00Z'))).toBe('2026-10-06');
    expect(localTime(new Date('2026-10-05T22:30:00Z'))).toBe('00:30');
    expect(localDate(new Date('2026-10-06T21:59:00Z'))).toBe('2026-10-06');
  });

  it('computes age on boundary dates', () => {
    expect(ageOn('2008-10-06', '2026-10-06')).toBe(18);
    expect(ageOn('2008-10-07', '2026-10-06')).toBe(17);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
  });

  it('supports every schedule kind', () => {
    const base = { startDate: '2026-10-05', endDate: '2026-10-31' }; // Monday
    expect(scheduledDates({ ...base, schedule: { kind: 'DAILY' } }, '2026-10-05', '2026-10-07')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
    expect(scheduledDates({ ...base, schedule: { kind: 'WEEKLY', weekday: 1 } }, '2026-10-01', '2026-10-20')).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
    expect(scheduledDates({ ...base, schedule: { kind: 'WEEKDAYS', weekdays: [2, 4] } }, '2026-10-05', '2026-10-11')).toEqual([
      '2026-10-06',
      '2026-10-08',
    ]);
    expect(scheduledDates({ ...base, schedule: { kind: 'EVERY_N_DAYS', interval: 3 } }, '2026-10-05', '2026-10-12')).toEqual([
      '2026-10-05',
      '2026-10-08',
      '2026-10-11',
    ]);
    expect(isScheduledOn({ ...base, schedule: { kind: 'CUSTOM', dates: ['2026-10-09'] } }, '2026-10-09')).toBe(true);
    expect(isScheduledOn({ ...base, schedule: { kind: 'DAILY' } }, '2026-11-01')).toBe(false);
  });
});

describe('onboarding', () => {
  it('creates structured records and keeps optional consents separate', () => {
    const { store, auditEventId } = run(createFixtureStore(NOW), member, onboardCommand());
    expect(store.members[NEW].onboardedAt).toBe(NOW.toISOString());
    expect(store.medicalHistories[NEW]).toBeDefined();
    expect(store.lifestyleProfiles[NEW]).toBeDefined();
    expect(Object.values(store.healthAssessments).filter((a) => a.memberId === NEW && a.kind === 'INTAKE')).toHaveLength(1);
    expect(Object.values(store.measurements).find((m) => m.memberId === NEW)?.value).toBe(82);
    expect(store.consents[`${NEW}_PRIVACY`].granted).toBe(true);
    expect(store.consents[`${NEW}_MARKETING`].granted).toBe(false);
    expect(store.operationalProfiles[NEW].onboardingStatus).toBe('COMPLETE');
    expect(store.auditEvents[auditEventId]).toMatchObject({ action: 'onboard', actorId: NEW, memberId: NEW });
  });

  it('rejects minors, including the day before an 18th birthday', () => {
    const cmd = onboardCommand();
    (cmd as { profile: { dateOfBirth: string } }).profile.dateOfBirth = '2008-10-07';
    expectError(() => run(createFixtureStore(NOW), member, cmd), 'PRECONDITION', /18/);
    (cmd as { profile: { dateOfBirth: string } }).profile.dateOfBirth = '2008-10-06';
    expect(() => run(createFixtureStore(NOW), member, cmd)).not.toThrow();
  });

  it('requires each required consent', () => {
    for (const key of ['privacy', 'terms', 'healthData', 'clinicalService']) {
      const consents = { privacy: true, terms: true, healthData: true, clinicalService: true, [key]: false };
      expectError(() => run(createFixtureStore(NOW), member, onboardCommand({ consents })), 'PRECONDITION', /consent/i);
    }
  });

  it('validates input shape and blocks repeat onboarding and staff onboarding', () => {
    expectError(() => run(createFixtureStore(NOW), member, onboardCommand({ body: { heightCm: 175, weightKg: 5 } })), 'INVALID');
    expectError(() => run(onboarded(), member, onboardCommand()), 'CONFLICT');
    expectError(() => run(createFixtureStore(NOW), clinician, onboardCommand()), 'FORBIDDEN');
  });
});

describe('requests and review', () => {
  it('blocks requests before onboarding, for hidden pathways and duplicates', () => {
    expectError(() => run(createFixtureStore(NOW), member, { type: 'request', treatmentId: 'trt-total-body-reset' }), 'PRECONDITION');
    let store = onboarded();
    store.treatments['trt-glow-up'].public = false;
    expectError(() => run(store, member, { type: 'request', treatmentId: 'trt-glow-up' }), 'NOT_FOUND');
    store = run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' }).store;
    expect(store.operationalProfiles[NEW].openRequestCount).toBe(1);
    expectError(() => run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' }), 'CONFLICT');
  });

  it('only lets the assigned clinician review, with a future review date', () => {
    let store = onboarded();
    const req = run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' });
    store = req.store;
    const review = {
      type: 'review' as const,
      requestId: req.resultId!,
      memberId: NEW,
      decision: 'DECLINED' as const,
      note: 'Not suitable',
      reviewDate: addDays(TODAY, 7),
    };
    expectError(() => run(store, otherClinician, review), 'FORBIDDEN');
    expectError(() => run(store, ops, review), 'FORBIDDEN');
    expectError(() => run(store, clinician, { ...review, reviewDate: TODAY }), 'INVALID', /future/);
    expectError(() => run(store, clinician, { ...review, memberId: EST }), 'NOT_FOUND');
    const done = run(store, clinician, review).store;
    expect(done.treatmentRequests[req.resultId!].status).toBe('DECLINED');
    expectError(() => run(done, clinician, review), 'CONFLICT');
  });

  it('requires a complete intake assessment', () => {
    let store = onboarded();
    const req = run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' });
    store = req.store;
    for (const a of Object.values(store.healthAssessments)) if (a.memberId === NEW) a.status = 'INCOMPLETE';
    expectError(
      () =>
        run(store, clinician, {
          type: 'review',
          requestId: req.resultId!,
          memberId: NEW,
          decision: 'NEEDS_INFORMATION',
          note: 'x',
          reviewDate: addDays(TODAY, 3),
        }),
      'PRECONDITION',
    );
  });

  it('approval creates approval, regimen, reminder, follow-up and notification', () => {
    const { store, approvalId, requestId } = approved();
    const approval = store.approvedTreatments[approvalId];
    expect(approval).toMatchObject({ status: 'ACTIVE', approvedQuantity: 2, remainingQuantity: 2, startDate: TODAY, expiresOn: addDays(TODAY, 27) });
    expect(Object.values(store.regimens).filter((r) => r.approvalId === approvalId)).toHaveLength(1);
    expect(Object.values(store.reminders).filter((r) => r.approvalId === approvalId && r.active)).toHaveLength(1);
    expect(Object.values(store.followUps).some((f) => f.approvalId === approvalId && f.dueDate === addDays(TODAY, 14))).toBe(true);
    expect(Object.values(store.notifications).some((n) => n.memberId === NEW && n.kind === 'DECISION')).toBe(true);
    expect(store.treatmentRequests[requestId].status).toBe('APPROVED');
    expect(store.operationalProfiles[NEW].openRequestCount).toBe(0);
  });

  it('a new approval supersedes the previous one and stops its reminders', () => {
    const first = approved();
    let store = run(first.store, member, { type: 'request', treatmentId: 'trt-total-body-reset' }).store;
    const reqId = Object.values(store.treatmentRequests).find((r) => r.status === 'OPEN')!.id;
    const second = run(store, clinician, {
      type: 'review',
      requestId: reqId,
      memberId: NEW,
      decision: 'APPROVED',
      note: 'Revised',
      reviewDate: addDays(TODAY, 30),
      approval: approvalPlan({ quantity: 4 }),
    });
    store = second.store;
    expect(store.approvedTreatments[first.approvalId].status).toBe('SUPERSEDED');
    expect(Object.values(store.reminders).filter((r) => r.approvalId === first.approvalId).every((r) => !r.active)).toBe(true);
    expect(store.approvedTreatments[second.resultId!].status).toBe('ACTIVE');
  });

  it('validates approval details and alternatives', () => {
    let store = onboarded();
    const req = run(store, member, { type: 'request', treatmentId: 'trt-total-body-reset' });
    store = req.store;
    const base = { type: 'review' as const, requestId: req.resultId!, memberId: NEW, note: 'n', reviewDate: addDays(TODAY, 5) };
    expectError(() => run(store, clinician, { ...base, decision: 'APPROVED' }), 'INVALID', /Approval details/);
    expectError(() => run(store, clinician, { ...base, decision: 'APPROVED', approval: approvalPlan({ startDate: addDays(TODAY, -1) }) }), 'INVALID');
    expectError(() => run(store, clinician, { ...base, decision: 'DECLINED', approval: approvalPlan() }), 'INVALID');
    expectError(() => run(store, clinician, { ...base, decision: 'ALTERNATIVE_RECOMMENDED' }), 'INVALID');
    expectError(
      () => run(store, clinician, { ...base, decision: 'ALTERNATIVE_RECOMMENDED', alternativeTreatmentId: 'trt-total-body-reset' }),
      'INVALID',
    );
    const alt = run(store, clinician, { ...base, decision: 'ALTERNATIVE_RECOMMENDED', alternativeTreatmentId: 'trt-glow-up' }).store;
    expect(alt.treatmentRequests[req.resultId!].alternativeTreatmentId).toBe('trt-glow-up');
  });
});

describe('adherence and reminders', () => {
  it('records taken doses once against a scheduled, past-due date', () => {
    const { store, approvalId } = approved();
    const taken = run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'TAKEN' }).store;
    expectError(() => run(taken, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'MISSED' }), 'CONFLICT');
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: addDays(TODAY, 1), action: 'TAKEN' }), 'INVALID', /due/);
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: addDays(TODAY, -1), action: 'TAKEN' }), 'INVALID', /scheduled/);
    expectError(() => run(store, established, { type: 'adherence', approvalId, dueDate: TODAY, action: 'TAKEN' }), 'NOT_FOUND');
  });

  it('bounds snooze to 15–120 minutes', () => {
    const { store, approvalId } = approved();
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'SNOOZED', snoozeMinutes: 10 }), 'INVALID');
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'SNOOZED', snoozeMinutes: 121 }), 'INVALID');
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'SNOOZED' }), 'INVALID');
    const s = run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'SNOOZED', snoozeMinutes: 15 }).store;
    const ev = Object.values(s.adherenceEvents)[0];
    expect(ev.snoozeUntil).toBe(new Date(NOW.getTime() + 15 * 60_000).toISOString());
  });

  it('rejects adherence after the approval expires or is superseded', () => {
    const { store, approvalId } = approved();
    const later = new Date('2026-11-10T08:00:00Z');
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: '2026-11-10', action: 'TAKEN' }, 'demo', later), 'PRECONDITION');
    store.approvedTreatments[approvalId].status = 'SUPERSEDED';
    expectError(() => run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'TAKEN' }), 'PRECONDITION');
  });

  it('lets members change reminder time but not the regimen', () => {
    const { store, approvalId } = approved();
    const reminder = Object.values(store.reminders).find((r) => r.approvalId === approvalId)!;
    const regimenBefore = JSON.stringify(store.regimens);
    const next = run(store, member, { type: 'notificationTime', reminderId: reminder.id, time: '19:30' }).store;
    expect(next.reminders[reminder.id].time).toBe('19:30');
    expect(JSON.stringify(next.regimens)).toBe(regimenBefore);
    expectError(() => run(store, member, { type: 'notificationTime', reminderId: reminder.id, time: '25:00' }), 'INVALID');
    expectError(() => run(store, established, { type: 'notificationTime', reminderId: reminder.id, time: '09:00' }), 'NOT_FOUND');
    // Members have no command that edits frequency.
    expectError(() => run(store, member, { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: {} }), 'FORBIDDEN');
  });

  it('decides reminders from approval, schedule, time and adherence', () => {
    const { store, approvalId } = approved();
    const reminder = Object.values(store.reminders).find((r) => r.approvalId === approvalId)!;
    const regimen = Object.values(store.regimens).find((r) => r.approvalId === approvalId)!;
    const approval = store.approvedTreatments[approvalId];
    const base = { reminder, approval, regimen, adherence: [] };
    const early = new Date('2026-10-06T05:00:00Z'); // 07:00 SA, before 08:00
    expect(reminderDecision({ ...base, now: early })).toMatchObject({ send: false, reason: 'not yet time' });
    const due = reminderDecision({ ...base, now: NOW });
    expect(due).toEqual({ send: true, dueDate: TODAY, notificationId: `rem_${reminder.id}_${TODAY}` });
    const taken = run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'TAKEN' }).store;
    expect(reminderDecision({ ...base, adherence: Object.values(taken.adherenceEvents), now: NOW }).send).toBe(false);
    const snoozed = run(store, member, { type: 'adherence', approvalId, dueDate: TODAY, action: 'SNOOZED', snoozeMinutes: 30 }).store;
    const events = Object.values(snoozed.adherenceEvents);
    expect(reminderDecision({ ...base, adherence: events, now: NOW })).toMatchObject({ send: false, reason: 'snoozed' });
    expect(reminderDecision({ ...base, adherence: events, now: new Date(NOW.getTime() + 31 * 60_000) })).toMatchObject({
      send: true,
      notificationId: `rem_${reminder.id}_${TODAY}_s1`,
    });
    expect(reminderDecision({ ...base, approval: { ...approval, status: 'SUPERSEDED' }, now: NOW }).send).toBe(false);
    expect(reminderDecision({ ...base, now: new Date('2026-12-01T08:00:00Z') }).send).toBe(false);
  });
});

describe('measurements', () => {
  it('validates value ranges and units', () => {
    const store = onboarded();
    expect(() => run(store, member, { type: 'measurement', measurement: { kind: 'WEIGHT', unit: 'kg', value: 80 } })).not.toThrow();
    expectError(() => run(store, member, { type: 'measurement', measurement: { kind: 'WEIGHT', unit: 'lb', value: 80 } } as never), 'INVALID');
    expectError(() => run(store, member, { type: 'measurement', measurement: { kind: 'SLEEP', unit: 'hours', value: 25 } }), 'INVALID');
    expectError(
      () => run(store, member, { type: 'measurement', measurement: { kind: 'BLOOD_PRESSURE', unit: 'mmHg', value: 80, value2: 90 } }),
      'INVALID',
      /Diastolic/,
    );
    const bp = run(store, member, { type: 'measurement', measurement: { kind: 'BLOOD_PRESSURE', unit: 'mmHg', value: 120, value2: 80 } });
    expect(bp.store.measurements[bp.resultId!]).toMatchObject({ value: 120, value2: 80, unit: 'mmHg' });
  });
});

describe('delivery address and checkout', () => {
  it('saves an address without creating an order or payment', () => {
    const store = onboarded();
    const next = run(store, member, { type: 'deliveryAddress', address }).store;
    expect(next.members[NEW].deliveryAddress).toEqual(address);
    expect(next.operationalProfiles[NEW].hasDeliveryAddress).toBe(true);
    expect(Object.keys(next.orders)).toHaveLength(0);
    expect(Object.keys(next.payments)).toHaveLength(0);
    expectError(() => run(store, member, { type: 'deliveryAddress', address: { ...address, postalCode: '80' } }), 'INVALID');
  });

  it('blocks checkout for the unverified, non-purchasable seed treatment', () => {
    const { store } = approved();
    expectError(() => run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1, address }), 'PRECONDITION');
    expect(purchaseBlocks(store, NEW, store.treatments['trt-total-body-reset'], 1, TODAY)).toEqual(['NOT_PURCHASABLE', 'NOT_VERIFIED']);
  });

  it('requires a current approval with enough quantity, stock and an address', () => {
    let store = makePurchasable(onboarded());
    expectError(() => run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1, address }), 'PRECONDITION', /approval/);
    store = makePurchasable(approved().store);
    expectError(() => run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 3, address }), 'PRECONDITION', /quantity/);
    expectError(() => run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1 }), 'INVALID', /address/);
    expectError(() => run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 7, address }), 'INVALID');
    const lowStock = structuredClone(store);
    lowStock.inventory['PRK-RESET'].onHand = 1;
    expectError(() => run(lowStock, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 2, address }), 'PRECONDITION', /stock/);
  });

  it('demo checkout simulates payment and consumes stock and approval quantity', () => {
    const { store: s0, approvalId } = approved();
    let store = makePurchasable(s0);
    store = run(store, member, { type: 'deliveryAddress', address }).store;
    const res = run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 2 });
    const order = res.store.orders[res.resultId!];
    expect(order).toMatchObject({ status: 'PAID', simulated: true, quantity: 2, totalCents: 379_800 });
    expect(order.deliveryAddress).toEqual(address);
    expect(Object.values(res.store.payments)[0]).toMatchObject({ provider: 'DEMO_SIMULATION', status: 'SIMULATED_PAID' });
    expect(Object.values(res.store.orderItems)).toHaveLength(1);
    expect(res.store.inventory['PRK-RESET'].reserved).toBe(2);
    expect(res.store.approvedTreatments[approvalId].remainingQuantity).toBe(0);
    expectError(() => run(res.store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1 }), 'PRECONDITION');
  });

  it('live checkout is payment pending and never claims payment', () => {
    const store = makePurchasable(approved('live').store);
    const res = run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1, address }, 'live');
    expect(res.store.orders[res.resultId!]).toMatchObject({ status: 'PAYMENT_PENDING', simulated: false });
    expect(Object.values(res.store.payments)[0]).toMatchObject({ provider: 'NONE', status: 'AWAITING_PROVIDER' });
  });

  it('does not need an approval for a non-prescription pathway', () => {
    let store = onboarded();
    store = run(store, admin, {
      type: 'catalogue',
      treatmentId: 'trt-deep-sleep-rebuild',
      changes: {
        requiresPrescription: false,
        requiresClinicianApproval: false,
        regulatoryStatus: 'VERIFIED',
        regulatoryReference: 'DEMO-REG-0002',
        purchasable: true,
      },
    }).store;
    expect(() => run(store, member, { type: 'checkout', treatmentId: 'trt-deep-sleep-rebuild', quantity: 1, address })).not.toThrow();
  });
});

describe('orders', () => {
  function paidOrder(mode: 'demo' | 'live' = 'demo') {
    const store = makePurchasable(approved(mode).store);
    const res = run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1, address }, mode);
    return { store: res.store, orderId: res.resultId! };
  }

  it('follows the transition graph and only fulfilment dispenses', () => {
    const paid = paidOrder();
    const orderId = paid.orderId;
    let store = paid.store;
    const move = (actor: Actor, status: 'PREPARING' | 'DISPENSED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'PAID') =>
      run(store, actor, { type: 'orderStatus', orderId, memberId: NEW, status });
    expectError(() => move(fulfilment, 'SHIPPED'), 'CONFLICT');
    store = move(ops, 'PREPARING').store;
    expectError(() => move(ops, 'DISPENSED'), 'FORBIDDEN');
    expectError(() => move(admin, 'DISPENSED'), 'FORBIDDEN');
    store = move(fulfilment, 'DISPENSED').store;
    expect(store.inventory['PRK-RESET']).toMatchObject({ onHand: 19, reserved: 0 });
    expect(store.shipments[`shp_${orderId}`].status).toBe('READY');
    store = move(fulfilment, 'SHIPPED').store;
    store = move(ops, 'DELIVERED').store;
    expect(store.orders[orderId].status).toBe('DELIVERED');
    expect(store.orders[orderId].statusHistory.map((h) => h.status)).toEqual(['PAID', 'PREPARING', 'DISPENSED', 'SHIPPED', 'DELIVERED']);
    expectError(() => move(ops, 'CANCELLED'), 'CONFLICT');
  });

  it('never lets staff mark a live order paid', () => {
    const { store, orderId } = paidOrder('live');
    expectError(() => run(store, ops, { type: 'orderStatus', orderId, memberId: NEW, status: 'PAID' }), 'CONFLICT');
    const cancelled = run(store, ops, { type: 'orderStatus', orderId, memberId: NEW, status: 'CANCELLED' }, 'live').store;
    expect(cancelled.inventory['PRK-RESET'].reserved).toBe(0);
    expect(Object.values(cancelled.approvedTreatments).find((a) => a.memberId === NEW)!.remainingQuantity).toBe(2);
    expect(Object.values(cancelled.payments)[0].status).toBe('VOID');
  });
});

describe('messages, notes, check-ins and follow-ups', () => {
  it('escalates side-effect messages and scopes staff replies', () => {
    const store = onboarded();
    const res = run(store, member, { type: 'message', topic: 'SIDE_EFFECT_CONCERN', body: 'Feeling unwell' });
    const thread = res.store.messageThreads[res.resultId!];
    expect(thread.escalated).toBe(true);
    expectError(() => run(res.store, ops, { type: 'message', threadId: thread.id, memberId: NEW, body: 'Hi' }), 'FORBIDDEN');
    expectError(() => run(res.store, otherClinician, { type: 'message', threadId: thread.id, memberId: NEW, body: 'Hi' }), 'FORBIDDEN');
    expectError(() => run(res.store, established, { type: 'message', threadId: thread.id, body: 'Hi' }), 'NOT_FOUND');
    expectError(() => run(res.store, fulfilment, { type: 'message', threadId: thread.id, memberId: NEW, body: 'Hi' }), 'FORBIDDEN');
    const reply = run(res.store, clinician, { type: 'message', threadId: thread.id, memberId: NEW, body: 'Calling you' }).store;
    expect(Object.values(reply.notifications).some((n) => n.kind === 'MESSAGE' && n.memberId === NEW)).toBe(true);
    const general = run(store, member, { type: 'message', topic: 'ORDER_DELIVERY', body: 'Where is it?' });
    expect(() => run(general.store, ops, { type: 'message', threadId: general.resultId!, memberId: NEW, body: 'Checking' })).not.toThrow();
  });

  it('keeps clinical notes with the assigned clinician', () => {
    const store = onboarded();
    expectError(() => run(store, otherClinician, { type: 'note', memberId: NEW, body: 'x' }), 'FORBIDDEN');
    expectError(() => run(store, ops, { type: 'note', memberId: NEW, body: 'x' }), 'FORBIDDEN');
    const res = run(store, clinician, { type: 'note', memberId: NEW, body: 'Confidential' });
    for (const actor of [member, ops, fulfilment, corporate, admin]) {
      expect(Object.keys(visible(res.store, actor).clinicalNotes)).toHaveLength(0);
    }
    expect(visible(res.store, clinician).clinicalNotes[res.resultId!]).toBeDefined();
  });

  it('lets the assigned clinician set nutrition targets', () => {
    const store = onboarded();
    const res = run(store, clinician, { type: 'nutrition', memberId: NEW, calorieTarget: 2000, proteinTargetG: 120, notes: '' });
    expect(res.store.nutritionProfiles[NEW].calorieTarget).toBe(2000);
    expectError(() => run(store, member, { type: 'nutrition', memberId: NEW, calorieTarget: 2000, proteinTargetG: 120, notes: '' }), 'FORBIDDEN');
  });

  it('opens an escalated thread when a check-in needs support', () => {
    const store = onboarded();
    const res = run(store, member, { type: 'checkin', mood: 2, energy: 2, sideEffects: true, needSupport: true, notes: 'Nausea' });
    const thread = Object.values(res.store.messageThreads).find((t) => t.memberId === NEW)!;
    expect(thread).toMatchObject({ topic: 'SIDE_EFFECT_CONCERN', escalated: true });
    expect(Object.values(res.store.messages).find((m) => m.threadId === thread.id)?.body).toBe('Nausea');
    const quiet = run(store, member, { type: 'checkin', mood: 4, energy: 4, sideEffects: false, needSupport: false, notes: '' });
    expect(Object.keys(quiet.store.messageThreads)).toHaveLength(0);
  });

  it('lets operations schedule but not complete clinical follow-ups', () => {
    const store = onboarded();
    const scheduled = run(store, ops, { type: 'followup', action: 'schedule', memberId: NEW, dueDate: addDays(TODAY, 3), reason: 'Call' });
    expectError(
      () => run(scheduled.store, ops, { type: 'followup', action: 'complete', memberId: NEW, followUpId: scheduled.resultId!, outcome: 'Done' }),
      'FORBIDDEN',
    );
    const done = run(scheduled.store, clinician, { type: 'followup', action: 'complete', memberId: NEW, followUpId: scheduled.resultId!, outcome: 'Done' });
    expect(done.store.followUps[scheduled.resultId!].status).toBe('COMPLETED');
    expect(visible(done.store, ops).followUps[scheduled.resultId!].outcome).toBeUndefined();
    expectError(() => run(store, ops, { type: 'followup', action: 'schedule', memberId: NEW, dueDate: addDays(TODAY, -1), reason: 'x' }), 'INVALID');
  });
});

describe('catalogue', () => {
  it('requires verification and a real reference to make a treatment purchasable', () => {
    const store = createFixtureStore(NOW);
    expectError(() => run(store, admin, { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: { purchasable: true } }), 'PRECONDITION', /verified/);
    for (const ref of ['', 'TBD', 'n/a', '12345']) {
      expectError(
        () =>
          run(store, admin, {
            type: 'catalogue',
            treatmentId: 'trt-total-body-reset',
            changes: { purchasable: true, regulatoryStatus: 'VERIFIED', regulatoryReference: ref },
          }),
        'PRECONDITION',
      );
    }
    expectError(() => run(store, ops, { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: { name: 'x' } }), 'FORBIDDEN');
    expectError(() => run(store, clinician, { type: 'catalogue', treatmentId: 'trt-total-body-reset', changes: { name: 'x' } }), 'FORBIDDEN');
  });

  it('creates private, inactive, unverified pathways with a zero-stock SKU', () => {
    const res = run(createFixtureStore(NOW), admin, {
      type: 'catalogueCreate',
      slug: 'new-demo',
      name: 'New demo',
      summary: 'Summary',
      category: 'Demo',
      inventorySku: 'NEW-DEMO',
    });
    expect(res.store.treatments[res.resultId!]).toMatchObject({ active: false, public: false, purchasable: false, regulatoryStatus: 'UNCONFIRMED' });
    expect(res.store.inventory['NEW-DEMO']).toMatchObject({ onHand: 0, reserved: 0 });
    expectError(
      () => run(res.store, admin, { type: 'catalogueCreate', slug: 'new-demo', name: 'x', summary: 'x', category: 'x', inventorySku: 'OTHER' }),
      'CONFLICT',
    );
  });

  it('never lets stock fall below reserved units', () => {
    const store = makePurchasable(approved().store);
    const res = run(store, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 2, address });
    expectError(() => run(res.store, admin, { type: 'stockAdjust', sku: 'PRK-RESET', onHand: 1 }), 'INVALID');
    expect(run(res.store, ops, { type: 'stockAdjust', sku: 'PRK-RESET', onHand: 2 }).store.inventory['PRK-RESET'].onHand).toBe(2);
    expectError(() => run(res.store, member, { type: 'stockAdjust', sku: 'PRK-RESET', onHand: 50 }), 'FORBIDDEN');
  });
});

describe('consent and notifications', () => {
  it('records withdrawal and notifies the member', () => {
    const store = onboarded();
    const res = run(store, member, { type: 'withdrawConsent', consentType: 'HEALTH_DATA' });
    expect(res.store.consents[`${NEW}_HEALTH_DATA`]).toMatchObject({ granted: false, withdrawnAt: NOW.toISOString() });
    expect(res.store.operationalProfiles[NEW].consentWithdrawn).toBe(true);
    expect(Object.values(res.store.notifications).some((n) => n.kind === 'CONSENT')).toBe(true);
    expectError(() => run(res.store, member, { type: 'withdrawConsent', consentType: 'HEALTH_DATA' }), 'PRECONDITION');
    expectError(() => run(store, member, { type: 'withdrawConsent', consentType: 'MARKETING' }), 'PRECONDITION');
  });

  it('only marks own notifications read', () => {
    const { store } = approved();
    const n = Object.values(store.notifications).find((x) => x.memberId === NEW)!;
    expect(run(store, member, { type: 'readNotification', notificationId: n.id }).store.notifications[n.id].read).toBe(true);
    expectError(() => run(store, established, { type: 'readNotification', notificationId: n.id }), 'NOT_FOUND');
  });
});

describe('visibility projection', () => {
  const { store } = approved();
  const withOrder = (() => {
    const s = makePurchasable(store);
    return run(s, member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1, address }).store;
  })();

  it('members see only their own records', () => {
    const v = visible(withOrder, member);
    expect(Object.values(v.approvedTreatments).every((a) => a.memberId === NEW)).toBe(true);
    expect(v.members[EST]).toBeUndefined();
    expect(Object.keys(v.operationalProfiles)).toHaveLength(0);
    expect(Object.keys(v.auditEvents)).toHaveLength(0);
  });

  it('clinicians see only assigned members', () => {
    const v = visible(withOrder, otherClinician);
    expect(Object.keys(v.members)).toHaveLength(0);
    expect(Object.keys(visible(withOrder, clinician).medicalHistories)).toContain(NEW);
  });

  it('operations, fulfilment, admin and corporate do not see medical data', () => {
    for (const actor of [ops, fulfilment, admin, corporate]) {
      const v = visible(withOrder, actor);
      for (const c of ['medicalHistories', 'healthAssessments', 'clinicalNotes', 'measurements', 'lifestyleProfiles', 'members'] as const) {
        expect(Object.keys(v[c]), `${actor.role} ${c}`).toHaveLength(0);
      }
    }
    expect(Object.keys(visible(withOrder, ops).orders)).toHaveLength(1);
    expect(Object.keys(visible(withOrder, fulfilment).orders)).toHaveLength(1);
    expect(Object.keys(visible(withOrder, corporate).orders)).toHaveLength(0);
    expect(Object.keys(visible(withOrder, corporate).operationalProfiles)).toHaveLength(0);
    expect(Object.keys(visible(withOrder, admin).auditEvents).length).toBeGreaterThan(0);
  });
});

describe('audit and persistence', () => {
  it('appends exactly one audit event per command and never mutates the input', () => {
    const store = onboarded();
    const before = JSON.stringify(store);
    const res = run(store, member, { type: 'measurement', measurement: { kind: 'SLEEP', unit: 'hours', value: 7 } });
    expect(JSON.stringify(store)).toBe(before);
    expect(Object.keys(res.store.auditEvents).length).toBe(Object.keys(store.auditEvents).length + 1);
    const changes = diffStores(store, res.store);
    expect(changes.map((c) => c.collection).sort()).toEqual(['auditEvents', 'measurements']);
  });

  it('audit events carry no health content', () => {
    const res = run(onboarded(), clinician, { type: 'note', memberId: NEW, body: 'Very private detail' });
    expect(JSON.stringify(res.store.auditEvents[res.auditEventId])).not.toContain('private');
  });

  it('rejects unknown commands', () => {
    expectError(() => run(onboarded(), member, { type: 'deleteEverything' } as never), 'INVALID');
  });
});
