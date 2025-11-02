// ========================================
// FILE 1: lib/supabase/client.ts
// ========================================
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/supabase";

// Client Component Client (for browser-side components)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
