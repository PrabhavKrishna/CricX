import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // DEBUG LOGGING - Check your terminal!
  if (!url || !key) {
    console.error("SERVER ERROR: Environment variables are MISSING in the server context.");
  } else {
    console.log(`SERVER CHECK: URL=${url.substring(0, 20)}... Key=${key.substring(0, 10)}...${key.substring(key.length - 5)}`);
  }

  return createServerClient(
    url!,
    key!,
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
