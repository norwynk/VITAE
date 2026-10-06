// Preview data boundary: the same fictional catalogue the demo server seeds.
import { createFixtureStore } from '@/domain/fixtures';
import type { Treatment } from '@/domain/model';

export function repository() {
  return {
    mode: 'demo' as const,
    publicCatalogue: async (): Promise<Treatment[]> =>
      Object.values(createFixtureStore(new Date()).treatments).filter((t) => t.active && t.public),
  };
}
