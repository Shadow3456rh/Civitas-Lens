/**
 * Browser Supabase Client
 *
 * Uses @supabase/ssr createBrowserClient to ensure auth cookies are synced
 * seamlessly between browser and Next.js server components/middleware.
 */

import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let browserClientInstance: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  browserClientInstance = createBrowserClient(supabaseUrl, anonKey);
  return browserClientInstance;
}
