import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.DEMO_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'vitae-demo-'));
process.env.DEMO_SESSION_SECRET = 'test-secret-not-for-production';

let demo: typeof import('../src/server/demo');
beforeAll(async () => {
  demo = await import('../src/server/demo');
});

describe('demo sessions', () => {
  it('round-trips an opaque session', async () => {
    const token = await demo.sealSession({ uid: 'demo-admin', role: 'SUPER_ADMIN' });
    expect(token).not.toContain('SUPER_ADMIN');
    expect(Buffer.from(token, 'base64url').toString('utf8')).not.toContain('SUPER_ADMIN');
    expect(await demo.openSession(token)).toEqual({ uid: 'demo-admin', role: 'SUPER_ADMIN' });
  });

  it('rejects tampered, garbage and expired sessions', async () => {
    const token = await demo.sealSession({ uid: 'demo-member-new', role: 'MEMBER' });
    const raw = Buffer.from(token, 'base64url');
    raw[raw.length - 1] ^= 1;
    expect(await demo.openSession(raw.toString('base64url'))).toBeNull();
    expect(await demo.openSession('not-a-session')).toBeNull();
    expect(await demo.openSession(undefined)).toBeNull();
    expect(await demo.openSession(token, Date.now() + demo.SESSION_TTL_MS + 1)).toBeNull();
    expect(await demo.openSession(token, Date.now() + demo.SESSION_TTL_MS - 60_000)).not.toBeNull();
  });

  it('is refused in production unless explicitly allowed, and in live mode', () => {
    expect(demo.demoAllowed({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true);
    expect(demo.demoAllowed({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
    expect(demo.demoAllowed({ NODE_ENV: 'production', ALLOW_PRODUCTION_DEMO: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(demo.demoAllowed({ NODE_ENV: 'development', DATA_MODE: 'live' } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('demo store', () => {
  it('applies the shared domain rules and persists', async () => {
    const member = demo.demoActorFor('MEMBER', 'established');
    const before = await demo.demoWorkspace(member);
    expect(Object.keys(before.store.approvedTreatments)).toHaveLength(1);
    await expect(demo.demoExecute(member, { type: 'checkout', treatmentId: 'trt-total-body-reset', quantity: 1 })).rejects.toThrow(
      /not available to order/,
    );
    await demo.demoExecute(member, { type: 'measurement', measurement: { kind: 'SLEEP', unit: 'hours', value: 7 } });
    const after = await demo.demoWorkspace(member);
    expect(Object.values(after.store.measurements).some((m) => m.kind === 'SLEEP')).toBe(true);
    const ops = await demo.demoWorkspace(demo.demoActorFor('OPERATIONS'));
    expect(Object.keys(ops.store.measurements)).toHaveLength(0);
    await demo.demoReset();
    const reset = await demo.demoWorkspace(member);
    expect(Object.values(reset.store.measurements).some((m) => m.kind === 'SLEEP')).toBe(false);
  });
});
