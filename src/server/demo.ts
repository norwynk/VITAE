/**
 * Local demo persistence and sessions. Fictional data only.
 *
 * Sessions are AES-256-GCM encrypted (opaque and tamper-proof), HTTP-only,
 * SameSite=strict cookies that expire after eight hours. The demo is refused
 * in production unless ALLOW_PRODUCTION_DEMO=true is set explicitly.
 */
import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type CommandResult, applyCommand, randomIdFactory } from '@/domain/commands';
import { DEMO_ESTABLISHED_MEMBER, DEMO_USERS, createFixtureStore } from '@/domain/fixtures';
import { type Actor, type Role, type Store, ROLES, emptyStore, visible } from '@/domain/model';

export const DEMO_COOKIE = 'demo_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const DEMO_DIR = process.env.DEMO_DATA_DIR ?? path.join(process.cwd(), '.demo');
const STORE_FILE = path.join(DEMO_DIR, 'store.json');
const SECRET_FILE = path.join(DEMO_DIR, 'session-secret');

export function demoAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.DATA_MODE ?? 'demo') !== 'demo') return false;
  if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_DEMO !== 'true') return false;
  return true;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

let cachedKey: Buffer | undefined;

async function sessionKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;
  let secret = process.env.DEMO_SESSION_SECRET;
  if (!secret) {
    await mkdir(DEMO_DIR, { recursive: true });
    try {
      secret = (await readFile(SECRET_FILE, 'utf8')).trim();
    } catch {
      secret = randomBytes(32).toString('hex');
      await writeFile(SECRET_FILE, secret, { mode: 0o600 });
    }
  }
  cachedKey = createHash('sha256').update(secret).digest();
  return cachedKey;
}

interface SessionPayload {
  uid: string;
  role: Role;
  exp: number;
}

export async function sealSession(actor: Actor, now = Date.now()): Promise<string> {
  const payload: SessionPayload = { uid: actor.uid, role: actor.role, exp: now + SESSION_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', await sessionKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export async function openSession(token: string | undefined, now = Date.now()): Promise<Actor | null> {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', await sessionKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (!(ROLES as readonly string[]).includes(payload.role) || typeof payload.uid !== 'string') return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

/** Demo identities a session may assume. */
export function demoActorFor(role: Role, persona?: string): Actor {
  if (role === 'MEMBER' && persona === 'established') return { uid: DEMO_ESTABLISHED_MEMBER.uid, role };
  return { uid: DEMO_USERS[role].uid, role };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();

/** Serialise access to the store file within this process. */
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(STORE_FILE, 'utf8')) as Partial<Store>;
    return { ...emptyStore(), ...parsed };
  } catch {
    const seeded = createFixtureStore(new Date());
    await writeStore(seeded);
    return seeded;
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(DEMO_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(store), { mode: 0o600 });
  await rename(tmp, STORE_FILE);
}

export function demoPublicCatalogue() {
  return exclusive(async () => Object.values((await readStore()).treatments).filter((t) => t.active && t.public));
}

export function demoWorkspace(actor: Actor) {
  return exclusive(async () => ({ actor, mode: 'demo' as const, store: visible(await readStore(), actor) }));
}

const newId = randomIdFactory();

export function demoExecute(actor: Actor, command: unknown): Promise<Omit<CommandResult, 'store'>> {
  return exclusive(async () => {
    const store = await readStore();
    const { store: next, resultId, auditEventId } = applyCommand(store, actor, command, { now: new Date(), mode: 'demo', newId });
    await writeStore(next);
    return { resultId, auditEventId };
  });
}

export function demoReset(): Promise<void> {
  return exclusive(() => writeStore(createFixtureStore(new Date())));
}
