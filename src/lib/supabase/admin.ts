import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE client. Bypasses Row Level Security entirely.
 *
 * Rules for using this file:
 *  - Only import it from Route Handlers or Server Actions, never from
 *    a Client Component ("use client").
 *  - The `server-only` import above makes Next.js throw a build error
 *    if this file is ever pulled into client-side code.
 *  - Every operation performed with this client MUST manually verify
 *    the caller's authorization first (there is no RLS safety net).
 *
 * Used for: accepting invitations (looking up a token before the
 * invitee has an account/session), and account deletion (removing an
 * auth.users row, which requires admin privileges).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "These must be set as server-only environment variables (never NEXT_PUBLIC_ prefixed for the key)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
