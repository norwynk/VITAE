import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { DomainError } from '@/domain/commands';
import { ROLES, type Role } from '@/domain/model';
import {
  DEMO_COOKIE,
  SESSION_TTL_MS,
  demoActorFor,
  demoAllowed,
  demoExecute,
  demoPublicCatalogue,
  demoReset,
  demoWorkspace,
  openSession,
  sealSession,
} from '@/server/demo';

export const dynamic = 'force-dynamic';

const STATUS: Record<DomainError['code'], number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID: 400,
  CONFLICT: 409,
  PRECONDITION: 422,
};

function error(status: number, message: string, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function json(body: unknown) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Behind a hosting proxy (Firebase App Hosting) `host` is the internal service
 * address and the public one arrives in `x-forwarded-host`; accept either.
 */
function sameHost(origin: string, request: NextRequest): boolean {
  const hosts = [request.headers.get('host'), request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()].filter(Boolean);
  try {
    return hosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!demoAllowed()) return error(404, 'Demo mode is not available');
  // Same-origin only: reject cross-site form posts even though cookies are SameSite=strict.
  const origin = request.headers.get('origin');
  if (origin && !sameHost(origin, request)) return error(403, 'Cross-origin request refused');

  let body: { action?: string; role?: string; persona?: string; command?: unknown };
  try {
    body = await request.json();
  } catch {
    return error(400, 'Invalid JSON');
  }

  const jar = await cookies();

  if (body.action === 'session') {
    if (!body.role || !(ROLES as readonly string[]).includes(body.role)) return error(400, 'Unknown role');
    const actor = demoActorFor(body.role as Role, body.persona);
    jar.set(DEMO_COOKIE, await sealSession(actor), {
      httpOnly: true,
      sameSite: 'strict',
      secure: request.nextUrl.protocol === 'https:',
      path: '/api/demo',
      maxAge: SESSION_TTL_MS / 1000,
    });
    return json({ actor });
  }

  if (body.action === 'catalogue') return json({ treatments: await demoPublicCatalogue() });

  if (body.action === 'signOut') {
    jar.delete({ name: DEMO_COOKIE, path: '/api/demo' });
    return json({ ok: true });
  }

  const actor = await openSession(jar.get(DEMO_COOKIE)?.value);
  if (!actor) return error(401, 'Choose a demo role to continue');

  try {
    switch (body.action) {
      case 'workspace':
        return json(await demoWorkspace(actor));
      case 'command':
        return json({ ok: true, ...(await demoExecute(actor, body.command)) });
      case 'reset':
        await demoReset();
        return json({ ok: true });
      default:
        return error(400, 'Unknown action');
    }
  } catch (e) {
    if (e instanceof DomainError) return error(STATUS[e.code], e.message, e.code);
    console.error(e);
    return error(500, 'Something went wrong');
  }
}
