/**
 * The Prick List: people who want to hear from PRICK, usually arriving from a
 * social bio. Open to the public, so it takes a first name, one way to reach
 * them and their permission, and nothing else. One entry per email or number.
 */
import { z } from 'zod';
import { DomainError } from './commands';
import type { PrickListEntry } from './model';

/** Where people can arrive from. Anything else counts as "other". */
export const LIST_SOURCES = ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin', 'whatsapp', 'email', 'website', 'other'] as const;
export type ListSource = (typeof LIST_SOURCES)[number];

export const SOURCE_LABEL: Record<ListSource, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  email: 'Email',
  website: 'The website',
  other: 'Somewhere else',
};

const listSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your first name').max(60),
  contact: z.string().trim().min(5, 'Add your email or WhatsApp number').max(120),
  consent: z.literal(true, { error: 'Tick the box so we’re allowed to message you' }),
  source: z.string().max(40).optional(),
  /** Hidden from people. Only a bot fills it in. */
  website: z.string().max(200).optional(),
});

export type PrickListInput = z.input<typeof listSchema>;
export type ParsedListEntry = Pick<PrickListEntry, 'id' | 'name' | 'contact' | 'kind' | 'source'>;

/** A source as typed in a link (?from=IG, utm_source=Instagram) or nothing at all. */
export function listSource(raw: string | null | undefined): ListSource {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return 'website';
  if (v === 'ig' || v.startsWith('insta')) return 'instagram';
  if (v === 'tt' || v.startsWith('tik')) return 'tiktok';
  if (v === 'fb' || v.startsWith('face') || v === 'meta') return 'facebook';
  if (v === 'yt' || v.startsWith('you')) return 'youtube';
  if (v === 'li' || v.startsWith('linked')) return 'linkedin';
  if (v === 'wa' || v.startsWith('whats')) return 'whatsapp';
  return (LIST_SOURCES as readonly string[]).includes(v) ? (v as ListSource) : 'other';
}

/** The same person however they typed it: case-blind emails, and 082 / +27 82 numbers as one. */
function contactKey(contact: string): { key: string; kind: PrickListEntry['kind'] } | null {
  if (contact.includes('@')) {
    const email = contact.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { key: `e_${email.replace(/[^a-z0-9]/g, '_')}`, kind: 'EMAIL' } : null;
  }
  if (!/^[+\d\s()-]+$/.test(contact)) return null;
  let digits = contact.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `27${digits.slice(1)}`;
  return digits.length >= 9 && digits.length <= 15 ? { key: `p_${digits}`, kind: 'PHONE' } : null;
}

/** Null means a bot: tell it all went well and save nothing. */
export function parseListEntry(input: unknown): ParsedListEntry | null {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) throw new DomainError('INVALID', parsed.error.issues[0]?.message ?? 'Check your details');
  const { name, contact, source, website } = parsed.data;
  if (website) return null;
  const key = contactKey(contact);
  if (!key) throw new DomainError('INVALID', 'That doesn’t look like an email or a WhatsApp number');
  return { id: `pl_${key.key}`, name, contact, kind: key.kind, source: listSource(source) };
}

/** What to save, or null if they're already on the list. Someone who left can come back. */
export function listRecord(entry: ParsedListEntry, existing: PrickListEntry | undefined, now: Date): PrickListEntry | null {
  if (existing && existing.status === 'IN') return null;
  const at = now.toISOString();
  return { ...entry, status: 'IN', consentAt: at, createdAt: at, updatedAt: at };
}
