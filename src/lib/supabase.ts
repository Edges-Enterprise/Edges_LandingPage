// lib/supabase.ts (corrected for @supabase/ssr exports)
import { createServerClient as _createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase'; // Generate from Supabase

// Server Client (for Server Components/Actions/Handlers)
export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient<Database>(
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
            // Ignore: Set from Server Component; middleware handles refresh
          }
        },
      },
    }
  );
}

// Client Component Client (for browser-side; correct export is createBrowserClient)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}