import { describe, expect, it } from 'vitest';
import { applyCommand } from '@/domain/commands';
import { type Actor, type RoyalSummons, emptyStore, visible } from '@/domain/model';
import { morningBrief } from '@/domain/morning';
import { parseSummons, summonsRecord } from '@/domain/summons';

const NOW = new Date('2026-11-09T08:00:00.000Z');
const valid = { name: 'Thandi M', phone: '082 123 4567', area: 'Sandton' };
const actor = (role: Actor['role']): Actor => ({ uid: `u-${role}`, role });
const ctx = { now: NOW, mode: 'demo' as const, newId: (p: string) => `${p}_1` };
const summons = (over: Partial<RoyalSummons> = {}): RoyalSummons => ({ id: 'rs_27821234567', name: 'Thandi M', phone: '082 123 4567', area: 'Sandton', status: 'NEW', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...over });
const storeWith = (s: RoyalSummons) => ({ ...emptyStore(), royalSummons: { [s.id]: s } });

describe('the Royal Summons', () => {
  it('treats one number as one person however it is typed', () => {
    expect(parseSummons(valid)?.id).toBe('rs_27821234567');
    expect(parseSummons({ ...valid, phone: '+27 82 123 4567' })?.id).toBe('rs_27821234567');
    expect(parseSummons({ ...valid, phone: '0027821234567' })?.id).toBe('rs_27821234567');
  });

  it('refuses details nobody could phone', () => {
    for (const bad of [{ ...valid, phone: 'call me maybe' }, { ...valid, phone: '12345' }, { ...valid, name: '' }, { ...valid, area: '' }]) {
      expect(() => parseSummons(bad)).toThrow();
    }
  });

  it('keeps only contact details', () => {
    expect(Object.keys(parseSummons({ ...valid, health: 'private' })!).sort()).toEqual(['area', 'id', 'name', 'phone']);
  });

  it('quietly drops a bot', () => {
    expect(parseSummons({ ...valid, website: 'http://spam.example' })).toBeNull();
  });

  it('does not repeat someone already on the list, but lets a no become a yes', () => {
    const parsed = parseSummons(valid)!;
    expect(summonsRecord(parsed, undefined, NOW)).toMatchObject({ status: 'NEW' });
    expect(summonsRecord(parsed, summons({ status: 'PHONED' }), NOW)).toBeNull();
    expect(summonsRecord(parsed, summons({ status: 'BOOKED' }), NOW)).toBeNull();
    expect(summonsRecord(parsed, summons({ status: 'NOT_GOING_AHEAD', phonedAt: NOW.toISOString() }), NOW)).toEqual(expect.objectContaining({ status: 'NEW' }));
    expect(summonsRecord(parsed, summons({ status: 'NOT_GOING_AHEAD', phonedAt: NOW.toISOString() }), NOW)).not.toHaveProperty('phonedAt');
  });

  it('is visible to the admin and nobody else', () => {
    const store = storeWith(summons());
    expect(Object.keys(visible(store, actor('SUPER_ADMIN')).royalSummons)).toHaveLength(1);
    for (const role of ['MEMBER', 'CLINICIAN', 'OPERATIONS', 'FULFILMENT', 'CORPORATE_ADMIN'] as const) {
      expect(visible(store, actor(role)).royalSummons).toEqual({});
    }
  });

  it('only lets the admin move it on, and records when they phoned', () => {
    const store = storeWith(summons());
    const command = { type: 'summonsStatus', summonsId: 'rs_27821234567', status: 'PHONED' };
    expect(() => applyCommand(store, actor('MEMBER'), command, ctx)).toThrow();
    expect(() => applyCommand(store, actor('OPERATIONS'), command, ctx)).toThrow();
    const done = applyCommand(store, actor('SUPER_ADMIN'), command, ctx);
    expect(done.store.royalSummons.rs_27821234567).toMatchObject({ status: 'PHONED', phonedAt: NOW.toISOString() });
  });

  it('puts a new summons on the morning list until someone has phoned', () => {
    const fresh = morningBrief(storeWith(summons()), NOW);
    expect(fresh.summons).toBe(1);
    expect(fresh.actions[0]).toMatchObject({ who: 'Team', tab: 'Royal Summons', late: false });
    expect(fresh.actions[0].text).toContain('Thandi M');
    expect(morningBrief(storeWith(summons({ status: 'PHONED' })), NOW).actions).toHaveLength(0);
    const twoDaysOn = new Date('2026-11-12T08:00:00.000Z');
    expect(morningBrief(storeWith(summons()), twoDaysOn).actions[0].late).toBe(true);
  });
});
