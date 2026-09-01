import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server client used in Server Components, Server Actions, and Route
 * Handlers. Runs as the logged-in user via their session cookie and
 * the public anon key -- RLS still applies. This is what almost
 * every server-side read/write should use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const cookieConfig = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      } catch {
        // setAll is called from a Server Component in some cases,
        // where cookies can't be mutated. Safe to ignore: the
        // middleware refreshes the session on every request.
      }
    },
  };

  const sessionReader = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieConfig }
  );

  const {
    data: { session },
  } = await sessionReader.auth.getSession();

  if (!session?.access_token) {
    return sessionReader;
  }

  // Build a plain client with its own internal session/auth-header
  // management fully disabled, and the user's access token hard-set
  // as the Authorization header. This avoids relying on @supabase/ssr's
  // automatic cookie-to-header wiring, which was not reliably attaching
  // the session token to outgoing PostgREST requests in Server Actions
  // -- requests were executing as the anon role despite a valid,
  // verified session being present.
  const scopedClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    }
  );

  return Object.assign(scopedClient, {
    auth: {
      ...scopedClient.auth,
      getUser: () => sessionReader.auth.getUser(),
      getSession: () => sessionReader.auth.getSession(),
      signOut: () => sessionReader.auth.signOut(),
      exchangeCodeForSession: (code: string) => sessionReader.auth.exchangeCodeForSession(code),
      resetPasswordForEmail: sessionReader.auth.resetPasswordForEmail.bind(sessionReader.auth),
      updateUser: sessionReader.auth.updateUser.bind(sessionReader.auth),
    },
  });
}
