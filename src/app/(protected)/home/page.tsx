// app/(protected)/home/page.tsx
import { createServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect('/sign-in');

  // Fetch profile (your RN logic)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl text-[#D7A77F]">Welcome, {profile?.username || user.email}!</h1>
      {/* Your protected UI */}
    </div>
  );
}