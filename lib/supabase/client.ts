// import { createBrowserClient } from '@supabase/ssr';
// import type { Database } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): any {
  // Supabase temporarily disabled - return mock client
  return null;

  // Original code (disabled):
  // return createBrowserClient<Database>(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // );
}
