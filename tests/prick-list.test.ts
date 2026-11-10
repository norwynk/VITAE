import { describe, expect, it } from 'vitest';
import { applyCommand } from '@/domain/commands';
import { type Actor, type PrickListEntry, emptyStore, visible } from '@/domain/model';
import { morningBrief } from '@/domain/morning';
import { listRecord, listSource, parseListEntry } from '@/domain/prickList';

const NOW = new Date('2026-11-16T08:00:00.000Z');
const valid = { name: 'Thandi', contact: 'Thandi@Example.com', consent: true, source: 'instagram' };
const actor = (role: Actor['role']): Actor => ({ uid: `u-${role}`, role });
const ctx = { now: NOW, mode: 'demo' as const, newId: (p: string) => `${p}_1` };
const entry = (over: Partial<PrickListEntry> = {}): PrickListEntry => ({ id: 'pl_e_thandi_example_com', name: 'Thandi', contact: 'thandi@example.com', kind: 'EMAIL', source: 'instagram', status: 'IN', consentAt: NOW.toISOString(), createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...over });
const storeWith = (...e: PrickListEntry[]) => ({ ...emptyStore(), prickList: Object.fromEntries(e.map((x) => [x.id, x])) });

describe('The Prick List', () => {
  it('treats one email or number as one person however it is typed', () => {
    expect(parseListEntry(valid)?.id).toBe(parseListEntry({ ...valid, contact: 'thandi@example.com' })?.id);
    expect(parseListEntry({ ...valid, contact: '082 123 4567' })?.id).toBe(parseListEntry({ ...valid, contact: '+27 82 123 4567' })?.id);
    expect(parseListEntry({ ...valid, contact: '082 123 4567' })?.kind).toBe('PHONE');
  });

  it('needs permission and a real way to reach them', () => {
    expect(() => parseListEntry({ ...valid, consent: false })).toThrow(/Tick the box/);
    for (const contact of ['not an email', 'hi@', '12345']) expect(() => parseListEntry({ ...valid, contact })).toThrow();
    expect(() => parseListEntry({ ...valid, name: '' })).toThrow();
  });

  it('keeps contact details only, and quietly drops a bot', () => {
    expect(Object.keys(parseListEntry({ ...valid, health: 'private' })!).sort()).toEqual(['contact', 'id', 'kind', 'name', 'source']);
    expect(parseListEntry({ ...valid, website: 'http://spam.example' })).toBeNull();
  });

  it('knows where people came from, whatever the link said', () => {
    expect(listSource('IG')).toBe('instagram');
    expect(listSource('Instagram')).toBe('instagram');
    expect(listSource('tt')).toBe('tiktok');
    expect(listSource('LinkedIn')).toBe('linkedin');
    expect(listSource('')).toBe('website');
    expect(listSource('newsletter-x')).toBe('other');
  });

  it('does not add someone twice, but someone who left can come back', () => {
    const parsed = parseListEntry(valid)!;
    expect(listRecord(parsed, undefined, NOW)).toMatchObject({ status: 'IN', source: 'instagram' });
    expect(listRecord(parsed, entry(), NOW)).toBeNull();
    expect(listRecord(parsed, entry({ status: 'OUT' }), NOW)).toMatchObject({ status: 'IN' });
  });

  it('is visible to the admin and nobody else', () => {
    const store = storeWith(entry());
    expect(Object.keys(visible(store, actor('SUPER_ADMIN')).prickList)).toHaveLength(1);
    for (const role of ['MEMBER', 'CLINICIAN', 'OPERATIONS', 'FULFILMENT', 'CORPORATE_ADMIN'] as const) expect(visible(store, actor(role)).prickList).toEqual({});
  });

  it('only the admin can take someone off, and they stay off the count', () => {
    const store = storeWith(entry(), entry({ id: 'pl_p_27821234567', contact: '0821234567', kind: 'PHONE', source: 'tiktok' }));
    const command = { type: 'prickListLeave', entryId: 'pl_e_thandi_example_com' };
    expect(() => applyCommand(store, actor('MEMBER'), command, ctx)).toThrow();
    const done = applyCommand(store, actor('SUPER_ADMIN'), command, ctx);
    expect(done.store.prickList.pl_e_thandi_example_com.status).toBe('OUT');
    expect(morningBrief(done.store, NOW).prickList).toEqual({ total: 1, thisWeek: 1 });
  });
});
