import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a minimal noop client for browser-side when envs are not set.
    // This avoids runtime crashes during local dev or build-time checks.
    // Most operations will fail gracefully with errors from the SDK.
    console.warn('Supabase environment variables missing during browser client creation — returning noop client');
    const chain: any = {
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      insert: () => chain,
      update: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => ({ data: null, error: null }),
    };

    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
        signInWithOAuth: async () => ({ error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      },
      from: () => chain,
    } as const;
  }

  return createBrowserClient(
    url,
    key,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );
}
