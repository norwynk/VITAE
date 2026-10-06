import type { DataMode } from './domain/commands';

/**
 * Data mode. `DATA_MODE` (server) and `NEXT_PUBLIC_DATA_MODE` (browser) must
 * match; `next.config.ts` refuses to build or start if they differ.
 */
export function publicDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'live' ? 'live' : 'demo';
}

export function assertMatchingDataModes(env: NodeJS.ProcessEnv = process.env): DataMode {
  const server = env.DATA_MODE ?? 'demo';
  const client = env.NEXT_PUBLIC_DATA_MODE ?? 'demo';
  for (const [name, value] of [['DATA_MODE', server], ['NEXT_PUBLIC_DATA_MODE', client]] as const) {
    if (value !== 'demo' && value !== 'live') throw new Error(`${name} must be "demo" or "live", got "${value}"`);
  }
  if (server !== client) throw new Error(`DATA_MODE (${server}) and NEXT_PUBLIC_DATA_MODE (${client}) must match`);
  return server as DataMode;
}

/** Brand name. The logo is still a typeset placeholder until it is finalised. */
export const SERVICE_NAME = 'PRICK';
