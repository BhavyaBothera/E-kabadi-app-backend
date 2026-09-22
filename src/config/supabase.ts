import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// 1. Privileged Admin Client (Only for explicit background, admin, or auth-bypass operations)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 2. User-Scoped Client Factory (Ensures RLS policies are enforced for the caller's JWT)
export const getAuthenticatedSupabaseClient = (accessToken: string): SupabaseClient => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// 3. Public Anon Client
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
