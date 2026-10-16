import type { DataMode } from './domain/commands';

/**
 * Data mode. `DATA_MODE` (server) and `NEXT_PUBLIC_DATA_MODE` (browser) must
 * match; `next.config.ts` refuses to build or start if they differ.
 */
export function publicDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'live' ? 'live' : 'demo';
}

const LIVE_SETTINGS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY',
] as const;

export function assertMatchingDataModes(env: NodeJS.ProcessEnv = process.env): DataMode {
  const server = env.DATA_MODE ?? 'demo';
  const client = env.NEXT_PUBLIC_DATA_MODE ?? 'demo';
  for (const [name, value] of [['DATA_MODE', server], ['NEXT_PUBLIC_DATA_MODE', client]] as const) {
    if (value !== 'demo' && value !== 'live') throw new Error(`${name} must be "demo" or "live", got "${value}"`);
  }
  if (server !== client) throw new Error(`DATA_MODE (${server}) and NEXT_PUBLIC_DATA_MODE (${client}) must match`);
  // A live build without its Firebase settings would be a site nobody can sign in to: refuse it, so the last good build stays up.
  if (server === 'live' && env.NEXT_PUBLIC_FIREBASE_EMULATORS !== 'true') {
    const missing = LIVE_SETTINGS.filter((name) => !env[name] || /PENDING/.test(env[name] ?? ''));
    if (missing.length) throw new Error(`Live mode needs ${missing.join(', ')}`);
  }
  return server as DataMode;
}

/** Brand name. The logo is still a typeset placeholder until it is finalised. */
export const SERVICE_NAME = 'PRICK';

/**
 * Online ordering and prices. Always on in the demo (payments are simulated);
 * in live mode only once NEXT_PUBLIC_SALES_ENABLED is "true". Until then
 * members can sign up, screen and save pens, and the care team arranges supply.
 */
export function salesOpen(): boolean {
  return publicDataMode() === 'demo' || process.env.NEXT_PUBLIC_SALES_ENABLED === 'true';
}
