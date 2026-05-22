import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  // Skip auth for callback page - tokens in URL not cookies yet
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request });
  }

  // If environment variables are missing, continue without auth checks
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Middleware: Supabase environment variables missing, skipping auth checks");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const publicPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/discover'];
    const isPublic = pathname === '/' || publicPaths.some(p => pathname.startsWith(p));

    if (!user && !isPublic && !pathname.startsWith('/api')) {
      const url = new URL('/auth/login', request.url);
      const response = NextResponse.redirect(url);
      // Copy cookies from supabaseResponse to the new redirect response
      supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c.name, c.value, c));
      return response;
    }

    if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
      const url = new URL('/dashboard', request.url);
      const response = NextResponse.redirect(url);
      // Copy cookies from supabaseResponse to the new redirect response
      supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c.name, c.value, c));
      return response;
    }
  } catch (error) {
    console.error("Middleware: Error checking user auth status:", error);
    // Continue with request even if auth check fails
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files like logos)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};