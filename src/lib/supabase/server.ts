/**
 * Server-Side Supabase Client (App Router)
 *
 * Uses @supabase/ssr createServerClient to access session cookies from next/headers.
 * Provides helpers to retrieve the current user and their profile role.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

export interface UserAuthContext {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: "citizen" | "analyst" | "admin";
}

/**
 * Retrieves the currently authenticated user and their profile role.
 */
export async function getCurrentUserAuth(): Promise<UserAuthContext | null> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Query profiles table for role, full_name, and phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as "citizen" | "analyst" | "admin") || "citizen";

    return {
      id: user.id,
      email: user.email || null,
      phone: profile?.phone || user.phone || null,
      full_name: profile?.full_name || null,
      role,
    };
  } catch (err) {
    console.warn("Error fetching current user auth context:", err);
    return null;
  }
}
