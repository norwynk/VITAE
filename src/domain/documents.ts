/**
 * Private document rules shared by the callables and tests. Files are
 * uploaded to a per-member quarantine prefix and only become readable, via a
 * short-lived signed URL, after a trusted scanner marks them CLEAN. No such
 * scanner is integrated yet, so every new document stays QUARANTINED.
 */
import {
  type Actor,
  type DocumentRecord,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CONTENT_TYPES,
  DOCUMENT_MAX_BYTES,
} from './model';
import { DomainError } from './commands';

export const QUARANTINE_PREFIX = 'incoming';
export const SIGNED_URL_TTL_MS = 60_000;

export function quarantinePath(uid: string, fileName: string): string {
  return `${QUARANTINE_PREFIX}/${uid}/${fileName}`;
}

const FILE_NAME_RE = /^[A-Za-z0-9._-]{1,120}$/;

export function validateDocumentRegistration(input: {
  actor: Actor;
  storagePath: string;
  name: string;
  category: string;
  contentType: string | undefined;
  sizeBytes: number;
}): { category: DocumentRecord['category']; contentType: DocumentRecord['contentType'] } {
  const { actor, storagePath } = input;
  if (actor.role !== 'MEMBER') throw new DomainError('FORBIDDEN', 'Only members can register documents');
  const parts = storagePath.split('/');
  if (parts.length !== 3 || parts[0] !== QUARANTINE_PREFIX || parts[1] !== actor.uid || !FILE_NAME_RE.test(parts[2])) {
    throw new DomainError('FORBIDDEN', 'Documents must be uploaded to your own quarantine folder');
  }
  const name = input.name.trim();
  if (!name || name.length > 120) throw new DomainError('INVALID', 'Give the document a name of up to 120 characters');
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(input.category)) throw new DomainError('INVALID', 'Unknown document category');
  if (!input.contentType || !(DOCUMENT_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    throw new DomainError('INVALID', 'Only PDF, JPEG and PNG files are accepted');
  }
  if (!(input.sizeBytes > 0) || input.sizeBytes > DOCUMENT_MAX_BYTES) throw new DomainError('INVALID', 'Files must be 10 MB or smaller');
  return {
    category: input.category as DocumentRecord['category'],
    contentType: input.contentType as DocumentRecord['contentType'],
  };
}

/** Owner or actively assigned clinician, and only once scanned CLEAN. */
export function assertDocumentAccess(actor: Actor, doc: DocumentRecord, clinicianAssigned: boolean): void {
  const owner = actor.role === 'MEMBER' && actor.uid === doc.memberId;
  const clinician = actor.role === 'CLINICIAN' && clinicianAssigned;
  if (!owner && !clinician) throw new DomainError('FORBIDDEN', 'You do not have access to this document');
  if (doc.scanStatus !== 'CLEAN') throw new DomainError('PRECONDITION', 'This document is still being checked and cannot be opened yet');
}
