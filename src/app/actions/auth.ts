// app/actions/auth.ts
'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function signInAction(prevState: { error?: string } = {}, formData: FormData) {
  const supabase = await createServerClient<Database>();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const rememberMe = formData.get('rememberMe') === 'on';

  if (!email || !password) return { error: 'Email and password required' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  if (data.user && data.session) {
    // Set rememberMe cookie (adjusts session expiry indirectly)
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    cookies().set('rememberMe', rememberMe.toString(), { maxAge, path: '/' });

    // Optional: Request push permissions (adapt for web: Web Push API)
    // await fetch('/api/request-push-perms', { method: 'POST', body: JSON.stringify({ userId: data.user.id }) });

    redirect('/home');
  }

  return { error: 'Sign in failed' };
}

// Similar for signUpAction (with profile upsert, rollback on error)
// ... (adapt your RN signUp: upsert to 'profiles', set rememberMe, handle errors)
export async function signUpAction(prevState: { error?: string } = {}, formData: FormData) {
  const supabase = await createServerClient<Database>();
  const username = (formData.get('username') as string)?.trim();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const rememberMe = formData.get('rememberMe') === 'on';

  if (!username || !email || !password || username.length < 3 || password.length < 6) {
    return { error: 'Please ensure username is at least 3 characters, email is valid, and password is at least 6 characters.' };
  }

  // Basic email validation (server-side fallback)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Invalid email format.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.message.includes('User already registered')) {
      return { error: 'This email is already registered.' };
    }
    return { error: error.message };
  }

  if (data.user) {
    // Upsert profile (from RN logic)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{ id: data.user.id, username, email: email.trim(), created_at: new Date().toISOString() }]);

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(data.user.id); // Requires service role; use Edge Function if needed
      return { error: 'Failed to save user profile.' };
    }

    // Set rememberMe cookie
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    cookies().set('rememberMe', rememberMe.toString(), { maxAge, path: '/' });

    // Optional: Request push permissions (adapt for web)

    redirect('/home'); // Or show success modal
  }

  return { error: 'Sign up failed' };
}

export async function signOutAction() {
  const supabase = await createServerClient<Database>();
  await supabase.auth.signOut();
  cookies().delete('rememberMe');
  redirect('/');
}

export async function deleteOwnAccountAction() {
  const supabase = await createServerClient<Database>();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) throw new Error('Not authenticated');

  const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ user_id: session.user.id }),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Delete failed');
  }

  await signOutAction();
}

export async function updateTransactionPinAction(currentPin: string, newPin: string) {
  const supabase = await createServerClient<Database>();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) throw new Error('Not authenticated');

  // Fetch & validate current PIN
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('transaction_pin')
    .eq('id', session.user.id)
    .single();

  if (fetchError || profile?.transaction_pin !== currentPin) {
    throw new Error('Current PIN incorrect');
  }

  // Update
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ transaction_pin: newPin })
    .eq('id', session.user.id);

  if (updateError) throw updateError;

  // Revalidate profile cache
  revalidatePath('/profile'); // Or your profile page
}