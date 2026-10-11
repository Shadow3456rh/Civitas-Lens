/**
 * Next.js Authentication & Authorization Middleware
 *
 * Protects /dashboard and /dashboard/:path* routes:
 * - Unauthenticated users are redirected to /login?next=...
 * - Authenticated users with role 'citizen' are redirected to /login?error=forbidden
 * - Only users with role 'analyst' or 'admin' can access /dashboard
 *
 * Public routes (/, /report, /report/:path*, /api/:path*, /login) remain accessible.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return response;
  }

  // Create SSR-synced Supabase client in middleware
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Only protect /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // 1. If unauthenticated, redirect to login with return path
    if (userError || !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Fetch user profile role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "citizen";


  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
  ],
};
