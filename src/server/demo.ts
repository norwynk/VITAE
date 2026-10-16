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
/** The member account this browser created through the questionnaire. */
export const DEMO_SIGNUP_COOKIE = 'demo_signup';
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
    return withNewPens({ ...emptyStore(), ...parsed });
  } catch {
    const seeded = createFixtureStore(new Date());
    await writeStore(seeded);
    return seeded;
  }
}

/**
 * Pens added to the range after this demo store was saved join it, with their
 * stock, so a release shows them without resetting anyone's demo data.
 * Existing records are never touched.
 */
export function withNewPens(store: Store): Store {
  const fresh = createFixtureStore(new Date());
  for (const t of Object.values(fresh.treatments)) {
    if (store.treatments[t.id]) continue;
    store.treatments[t.id] = t;
    const stock = fresh.inventory[t.inventorySku];
    if (stock && !store.inventory[stock.id]) store.inventory[stock.id] = stock;
  }
  return store;
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

/**
 * A brand-new demo member, as if they had just created an account after the
 * questionnaire. Each sign-up gets its own record, assigned to the demo
 * clinician, so visitors never share answers.
 */
export function demoSignUp(): Promise<Actor> {
  return exclusive(async () => {
    const store = await readStore();
    const uid = `demo-member-${randomBytes(6).toString('hex')}`;
    const at = new Date().toISOString();
    store.users[uid] = { id: uid, email: `${uid}@example.invalid`, displayName: '', role: 'MEMBER', createdAt: at, updatedAt: at };
    store.members[uid] = { id: uid, memberId: uid, firstName: '', lastName: '', email: `${uid}@example.invalid`, createdAt: at, updatedAt: at };
    store.operationalProfiles[uid] = {
      id: uid,
      memberId: uid,
      displayName: 'New member',
      onboardingStatus: 'NOT_STARTED',
      hasDeliveryAddress: false,
      openRequestCount: 0,
      consentWithdrawn: false,
      lastActivityAt: at,
    };
    store.providerAssignments[`pa-${uid}`] = { id: `pa-${uid}`, memberId: uid, clinicianId: DEMO_USERS.CLINICIAN.uid, active: true, createdAt: at };
    await writeStore(store);
    return { uid, role: 'MEMBER' as const };
  });
}

export function demoReset(): Promise<void> {
  return exclusive(() => writeStore(createFixtureStore(new Date())));
}
