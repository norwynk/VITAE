/**
 * Deploys the Cloud Functions to the live project. The first load on Windows
 * can be slower than the CLI's 10-second check, so allow a minute.
 *
 *   npm run deploy:functions
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('firebase', ['deploy', '--only', 'functions', '--project', 'prick-c3c43'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? '60' },
});
process.exit(result.status ?? 1);
