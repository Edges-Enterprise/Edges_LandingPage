// ========================================
//  lib/supabase/server.ts
// ========================================
import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";


// Server Client (for Server Components/Actions/Route Handlers)
// Runs as the logged-in user (via their session cookie) on the anon key so
// Postgres RLS (auth.uid()-based policies) actually scopes what this client
// can see and change. Previously ran on SUPABASE_SERVICE_ROLE_KEY, which
// bypassed RLS entirely regardless of whose cookie was attached — see
// handover.md "Known Irregularity #9". For genuine system/service-role work
// with no user session (webhooks, cron, admin-only aggregation), use
// createAdminClient() from "@/lib/supabase/admin" instead.
export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // Ignore: Called from Server Component; middleware handles refresh
          }
        },
      },
    }
  );
}

// Helper function to get authenticated user on server
export async function getUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return user;
}

// Helper function to get session on server
export async function getSession() {
  const supabase = await createServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error fetching session:", error);
    return null;
  }

  return session;
}
