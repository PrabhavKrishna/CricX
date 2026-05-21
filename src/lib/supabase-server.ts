import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Minimal fallback client used during build / when env vars are missing.
function createNoopServerClient() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: null, error: null }),
    insert: () => chain,
    update: () => chain,
    order: () => chain,
    limit: () => chain,
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
      signInWithOAuth: async () => ({ error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
    },
    from: () => chain,
  } as const;
}

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, return a safe no-op client so server-side
  // prerendering doesn't throw while building on platforms where envs
  // are not yet configured.
  if (!url || !key) {
    // Keep a clear log so deployers know what's missing.
    // Vercel users should set NEXT_PUBLIC_SUPABASE_URL and
    // NEXT_PUBLIC_SUPABASE_ANON_KEY in project Environment Variables.
    console.warn('Supabase environment variables missing during server client creation — returning noop client');
    return createNoopServerClient();
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This can be ignored if middleware is handling cookie refreshes
          }
        },
      },
    }
  );
}
