import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Only ever uses the public anon key + public URL.
 * Row Level Security enforces what this client can actually see or
 * change -- it must never be trusted to enforce authorization itself.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
