/**
 * The Royal Summons: someone asking us to phone them about the Royal Prick
 * Experience. Open to the public, so it takes contact details and nothing else.
 * One summons per phone number, which also stops a bot filling the admin's list.
 */
import { z } from 'zod';
import { DomainError } from './commands';
import type { RoyalSummons } from './model';

const summonsSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80),
  phone: z.string().trim().min(9, 'Enter a number we can phone').max(24),
  area: z.string().trim().min(2, 'Tell us where you are').max(120),
  /** Hidden from people. Only a bot fills it in. */
  website: z.string().max(200).optional(),
});

export type SummonsInput = z.input<typeof summonsSchema>;
export type ParsedSummons = Pick<RoyalSummons, 'id' | 'name' | 'phone' | 'area'>;

/** The same number however it was typed: 082 123 4567 and +27 82 123 4567 are one person. */
function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  return digits.startsWith('0') ? `27${digits.slice(1)}` : digits;
}

/** Null means a bot: tell it all went well and save nothing. */
export function parseSummons(input: unknown): ParsedSummons | null {
  const parsed = summonsSchema.safeParse(input);
  if (!parsed.success) throw new DomainError('INVALID', parsed.error.issues[0]?.message ?? 'Check your details');
  const { name, phone, area, website } = parsed.data;
  if (website) return null;
  const key = phoneKey(phone);
  if (!/^[+\d\s()-]+$/.test(phone) || key.length < 9 || key.length > 15) throw new DomainError('INVALID', 'Enter a number we can phone');
  return { id: `rs_${key}`, name, phone, area };
}

/** What to save, or null if we already have this person on the list. Someone who said no earlier can change their mind. */
export function summonsRecord(summons: ParsedSummons, existing: RoyalSummons | undefined, now: Date): RoyalSummons | null {
  if (existing && existing.status !== 'NOT_GOING_AHEAD') return null;
  const at = now.toISOString();
  return { ...summons, status: 'NEW', createdAt: at, updatedAt: at };
}
