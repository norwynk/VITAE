import { describe, expect, it } from 'vitest';
import { type CommandInput, DomainError, applyCommand } from '../src/domain/commands';
import { DEMO_USERS, createFixtureStore, demoActor } from '../src/domain/fixtures';
import { HAPPY_HORMONES, HH_BLOODS_NURSE, HH_BLOODS_OWN, hhNurseVisitPrice, hhOptionsFor, validateIntake } from '../src/domain/intake';
import { type Store, SA_PROVINCES, visible } from '../src/domain/model';
import { morningBrief } from '../src/domain/morning';

const NOW = new Date('2026-11-16T08:30:00Z');
const NEW = DEMO_USERS.MEMBER.uid;
const member = demoActor('MEMBER');
const admin = demoActor('SUPER_ADMIN');
const clinician = demoActor('CLINICIAN');

let n = 0;
const run = (store: Store, actor = member, command: CommandInput, now = NOW) => applyCommand(store, actor, command, { now, mode: 'demo', newId: (p) => `${p}_hh${++n}` });

const intake = (extra: Record<string, unknown> = {}) => ({
  pathway: HAPPY_HORMONES,
  firstName: 'Alex',
  dateOfBirth: '1975-01-15',
  sex: 'Female',
  province: 'Western Cape',
  city: 'Cape Town',
  heightCm: '170',
  weightKg: '70',
  goals: ['Hormones'],
  reason: 'Hot flushes and no sleep',
  hhFor: ['Estrogen gel', 'Progesterone tablets'],
  hhBloods: HH_BLOODS_NURSE,
  conditions: ['None'],
  allergies: ['None'],
  medications: [{ name: 'Vitamin D', dose: '1000 IU', frequency: 'Daily', reason: 'Low levels' }],
  previousPeptides: 'No',
  familyHistory: ['None'],
  smoking: 'No',
  alcohol: 'None',
  activity: 'Moderate',
  sleepHours: '5',
  pregnant: 'No',
  breastfeeding: 'No',
  planningPregnancy: 'No',
  menopauseStage: 'Perimenopause',
  ...extra,
});

const onboard = (answers: Record<string, unknown>): CommandInput =>
  ({
    type: 'onboard',
    profile: { firstName: 'Alex', lastName: 'Demo', dateOfBirth: '1975-01-15', identity: { type: 'SA_ID', number: '7501155000080' }, phone: '+27 82 000 0000', province: 'Western Cape', city: 'Cape Town' },
    body: { heightCm: 170, weightKg: 70 },
    goals: { goals: ['Hormones'], motivation: 'Sleep again' },
    health: { conditions: [], medications: '', allergies: '', pregnancyOrBreastfeeding: false, previousPeptideUse: false, notes: '' },
    testingInterest: true,
    consents: { privacy: true, terms: true, healthData: true, clinicalService: true, communications: false, marketing: false },
    intake: answers,
  }) as CommandInput;

describe('Happy Hormones: bloods first', () => {
  it('asks a Happy Hormones screening how they will do their bloods, and never skips it', () => {
    const { hhBloods: _skip, ...without } = intake();
    expect(validateIntake(without, SA_PROVINCES).questionId).toBe('hhBloods');
    expect(validateIntake(intake(), SA_PROVINCES).problem).toBeUndefined();
  });

  it('asks when their own results were taken, only if they are sending them', () => {
    expect(validateIntake(intake({ hhBloods: HH_BLOODS_OWN }), SA_PROVINCES).questionId).toBe('hhResultsWhen');
    expect(validateIntake(intake({ hhBloods: HH_BLOODS_OWN, hhResultsWhen: 'In the last 3 months' }), SA_PROVINCES).problem).toBeUndefined();
  });

  it('leaves a PRICK peptide screening without a bloods stop', () => {
    const { pathway: _p, hhFor: _f, hhBloods: _b, ...prick } = intake();
    const checked = validateIntake({ ...prick, hhBloods: HH_BLOODS_NURSE }, SA_PROVINCES);
    expect(checked.problem).toBeUndefined();
    expect(checked.answers.hhBloods).toBeUndefined();
  });

  it('offers the hormones that fit: two for her, one for him', () => {
    expect(hhOptionsFor({ sex: 'Female' })).toEqual(['Progesterone tablets', 'Estrogen gel', 'Not sure yet']);
    expect(hhOptionsFor({ sex: 'Male' })).toEqual(['Testosterone (the Full Throttle pen)', 'Not sure yet']);
    expect(hhOptionsFor({ sex: 'Prefer to discuss with my clinician' })).toHaveLength(4);
  });

  it('shows the nurse visit as price to be confirmed until a price is set', () => {
    expect(hhNurseVisitPrice()).toBe('price to be confirmed');
    expect(hhNurseVisitPrice(650)).toBe('R650');
  });

  it('puts a nurse visit on the admin list and the morning to-dos, with no health details', () => {
    const { store } = run(createFixtureStore(NOW), member, onboard(intake()));
    const seen = visible(store, admin);
    expect(seen.operationalProfiles[NEW].hormoneBloods).toMatchObject({ route: 'NURSE_VISIT', status: 'TO_ARRANGE' });
    expect(JSON.stringify(seen.operationalProfiles[NEW])).not.toMatch(/Estrogen|Progesterone|Perimenopause/);
    const brief = morningBrief(seen, NOW);
    expect(brief.bloods).toBe(1);
    expect(brief.actions.find((a) => a.tab === 'The Blood Bank')?.text).toMatch(/Book a nurse to take Alex Demo's bloods/);
  });

  it('records someone sending their own results', () => {
    const { store } = run(createFixtureStore(NOW), member, onboard(intake({ hhBloods: HH_BLOODS_OWN, hhResultsWhen: '3 to 12 months ago' })));
    expect(store.operationalProfiles[NEW].hormoneBloods?.route).toBe('OWN_RESULTS');
  });

  it('gives a PRICK peptide screening no bloods to arrange', () => {
    const { pathway: _p, hhFor: _f, hhBloods: _b, ...prick } = intake();
    const { store } = run(createFixtureStore(NOW), member, onboard(prick));
    expect(store.operationalProfiles[NEW].hormoneBloods).toBeUndefined();
    expect(morningBrief(visible(store, admin), NOW).bloods).toBe(0);
  });

  it('lets the admin move the bloods on, and nobody else', () => {
    const base = run(createFixtureStore(NOW), member, onboard(intake())).store;
    const booked = run(base, admin, { type: 'hormoneBloods', memberId: NEW, status: 'BOOKED' }).store;
    expect(booked.operationalProfiles[NEW].hormoneBloods?.status).toBe('BOOKED');
    expect(morningBrief(visible(booked, admin), NOW).bloods).toBe(0);
    for (const actor of [member, clinician]) expect(() => run(base, actor, { type: 'hormoneBloods', memberId: NEW, status: 'RESULTS_IN' })).toThrow(DomainError);
  });
});
