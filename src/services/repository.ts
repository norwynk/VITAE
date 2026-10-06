/**
 * UI data boundary. Components call this, never Firestore directly. The
 * implementation is chosen by NEXT_PUBLIC_DATA_MODE: the Firebase callable
 * repository in live mode, the local demo HTTP adapter otherwise.
 */
import type { CommandInput, DataMode } from '@/domain/commands';
import type { Actor, Role, Store, Treatment } from '@/domain/model';
import { publicDataMode } from '@/config';

export interface Workspace {
  actor: Actor;
  mode: DataMode;
  store: Store;
}

export interface CommandOutcome {
  resultId?: string;
  auditEventId?: string;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface Repository {
  mode: DataMode;
  /** Active, public pathways; readable without signing in. */
  publicCatalogue(): Promise<Treatment[]>;
  getWorkspace(): Promise<Workspace>;
  execute(command: CommandInput): Promise<CommandOutcome>;
}

// ---------------------------------------------------------------------------
// Demo adapter
// ---------------------------------------------------------------------------

async function demoPost<T>(body: unknown): Promise<T> {
  const res = await fetch('/api/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new RepositoryError(data?.error?.message ?? 'Request failed', data?.error?.code, res.status);
  return data as T;
}

export const demoRepository: Repository & {
  startSession(role: Role, persona?: string): Promise<Actor>;
  signOut(): Promise<void>;
  reset(): Promise<void>;
} = {
  mode: 'demo',
  publicCatalogue: async () => (await demoPost<{ treatments: Treatment[] }>({ action: 'catalogue' })).treatments,
  getWorkspace: () => demoPost<Workspace>({ action: 'workspace' }),
  execute: (command) => demoPost<CommandOutcome>({ action: 'command', command }),
  startSession: async (role, persona) => (await demoPost<{ actor: Actor }>({ action: 'session', role, persona })).actor,
  signOut: async () => void (await demoPost({ action: 'signOut' })),
  reset: async () => void (await demoPost({ action: 'reset' })),
};

// ---------------------------------------------------------------------------
// Firebase callable adapter
// ---------------------------------------------------------------------------

async function callable<T>(name: string, data: unknown): Promise<T> {
  const [{ httpsCallable }, { firebase }] = await Promise.all([import('firebase/functions'), import('./firebase')]);
  try {
    const result = await httpsCallable(firebase().functions, name)(data);
    return result.data as T;
  } catch (e) {
    const err = e as { message?: string; code?: string };
    throw new RepositoryError(err.message ?? 'Request failed', err.code);
  }
}

export const firebaseRepository: Repository & {
  provisionMember(): Promise<{ created: boolean; refreshToken: boolean }>;
} = {
  mode: 'live',
  publicCatalogue: async () => {
    const [{ collection, getDocs, query, where }, { firebase }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase'),
    ]);
    const snap = await getDocs(query(collection(firebase().db, 'treatments'), where('public', '==', true), where('active', '==', true)));
    return snap.docs.map((d) => ({ ...(d.data() as Treatment), id: d.id }));
  },
  getWorkspace: () => callable<Workspace>('getWorkspace', {}),
  execute: (command) => callable<CommandOutcome>('executeCommand', command),
  provisionMember: () => callable('provisionMember', {}),
};

export function repository(): Repository {
  return publicDataMode() === 'live' ? firebaseRepository : demoRepository;
}
