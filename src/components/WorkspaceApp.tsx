'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CommandInput } from '@/domain/commands';
import { ROLES, type Role } from '@/domain/model';
import { SiteNav } from './site/SiteNav';
import { RepositoryError, type Workspace, demoRepository, repository } from '@/services/repository';
import { LiveAuthGate } from './LiveAuthGate';
import { MemberHome } from './member/MemberHome';
import { AdminHome } from './staff/AdminHome';
import { ClinicianHome } from './staff/ClinicianHome';
import { CorporateHome } from './staff/CorporateHome';
import { FulfilmentHome } from './staff/FulfilmentHome';
import { OperationsHome } from './staff/OperationsHome';
import { Notice, humanise } from './ui';
import { WorkspaceContext, type WorkspaceApi } from './workspace-context';

type Flash = { tone: 'ok' | 'error'; text: string } | null;

export function WorkspaceApp() {
  const repo = useMemo(() => repository(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [needsSession, setNeedsSession] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  const refresh = useCallback(async () => {
    try {
      setWorkspace(await repo.getWorkspace());
      setNeedsSession(false);
      setLoadError(null);
    } catch (e) {
      if (e instanceof RepositoryError && e.status === 401) setNeedsSession(true);
      else setLoadError((e as Error).message);
      setWorkspace(null);
    }
  }, [repo]);

  useEffect(() => {
    // Live mode waits for sign-in; demo loads straight away (state is set in the promise callback).
    if (repo.mode === 'demo') void Promise.resolve().then(refresh);
  }, [repo, refresh]);

  const run = useCallback(
    async (command: CommandInput, success: string) => {
      setBusy(true);
      setFlash(null);
      try {
        await repo.execute(command);
        await refresh();
        setFlash({ tone: 'ok', text: success });
        return true;
      } catch (e) {
        setFlash({ tone: 'error', text: (e as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [repo, refresh],
  );

  const api: WorkspaceApi | null = workspace ? { workspace, busy, run, refresh } : null;

  const body: ReactNode = (() => {
    if (repo.mode === 'live' && !workspace) return <LiveAuthGate onReady={refresh} error={loadError} />;
    if (needsSession) return <DemoRolePicker onChosen={refresh} />;
    if (loadError) return <Notice tone="error">{loadError}</Notice>;
    if (!api) return <p className="muted">Loading…</p>;
    return (
      <WorkspaceContext.Provider value={api}>
        <RoleHome role={api.workspace.actor.role} />
      </WorkspaceContext.Provider>
    );
  })();

  return (
    <div className="calm">
      <SiteNav cta={false} />
      {repo.mode === 'demo' && workspace && (
        <div className="container toolbar">
          <span className="muted">Demo workspace · fictional data</span>
          <DemoControls
            role={workspace.actor.role}
            uid={workspace.actor.uid}
            onChanged={async () => {
              setFlash(null);
              await refresh();
            }}
          />
        </div>
      )}
      <main className="container stack app-main">
        {flash && (
          <div className="toast">
            <Notice tone={flash.tone}>{flash.text}</Notice>
          </div>
        )}
        {body}
      </main>
    </div>
  );
}

function RoleHome({ role }: { role: Role }) {
  switch (role) {
    case 'MEMBER':
      return <MemberHome />;
    case 'CLINICIAN':
      return <ClinicianHome />;
    case 'OPERATIONS':
      return <OperationsHome />;
    case 'FULFILMENT':
      return <FulfilmentHome />;
    case 'SUPER_ADMIN':
      return <AdminHome />;
    case 'CORPORATE_ADMIN':
      return <CorporateHome />;
  }
}

const PERSONAS: { label: string; role: Role; persona?: string }[] = [
  { label: 'New member', role: 'MEMBER' },
  { label: 'Established member', role: 'MEMBER', persona: 'established' },
  ...ROLES.filter((r) => r !== 'MEMBER').map((role) => ({ label: humanise(role), role })),
];

function DemoRolePicker({ onChosen }: { onChosen: () => Promise<void> }) {
  const choose = async (p: (typeof PERSONAS)[number]) => {
    await demoRepository.startSession(p.role, p.persona);
    await onChosen();
  };
  return (
    <section className="screening-intro">
      <p className="eyebrow">Demo preview</p>
      <h1 className="display">
        Welcome in.
        <span className="serif-i">This is a demo, so there&apos;s no sign-in yet.</span>
      </h1>
      <p style={{ maxWidth: '52ch' }}>
        Everyone and everything here is fictional, and demo payments are simulated. No money is ever charged.
      </p>
      <div className="row">
        <button type="button" onClick={() => choose(PERSONAS[0])}>
          New member
        </button>
        <button type="button" className="secondary" onClick={() => choose(PERSONAS[1])}>
          Established member
        </button>
      </div>
      <details>
        <summary className="small muted" style={{ cursor: 'pointer' }}>
          Staff demo roles
        </summary>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          {PERSONAS.slice(2).map((p) => (
            <button key={p.label} type="button" className="secondary small" onClick={() => choose(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

function DemoControls({ role, uid, onChanged }: { role: Role; uid: string; onChanged: () => Promise<void> }) {
  const current = PERSONAS.findIndex(
    (p) => p.role === role && (role !== 'MEMBER' || (p.persona === 'established') === uid.includes('established')),
  );
  return (
    <div className="row small">
      <label style={{ flexDirection: 'row', alignItems: 'center' }}>
        Demo role
        <select
          aria-label="Demo role"
          value={current}
          onChange={async (e) => {
            const p = PERSONAS[Number(e.target.value)];
            await demoRepository.startSession(p.role, p.persona);
            await onChanged();
          }}
        >
          {PERSONAS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          if (!window.confirm('Reset all demo data to the fictional starting state?')) return;
          await demoRepository.reset();
          await onChanged();
        }}
      >
        Reset demo data
      </button>
    </div>
  );
}
