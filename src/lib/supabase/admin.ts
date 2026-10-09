/**
 * Supabase Admin Client
 *
 * Uses the privileged SUPABASE_SERVICE_ROLE_KEY to perform server-side writes,
 * storage operations, and spatial RPC queries that bypass Row Level Security.
 *
 * SERVER-SIDE ONLY — never import this on the client.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClientInstance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL environment variable is missing. Check .env or .env.local.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Check .env or .env.local.",
    );
  }

  adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClientInstance;
}
