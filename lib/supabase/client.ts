// import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  // Supabase temporarily disabled - return mock client
  return null as any;

  // Original code (disabled):
  // return createBrowserClient<Database>(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // );
}
