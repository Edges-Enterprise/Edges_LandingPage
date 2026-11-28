// app/(protected)/layout.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProtectedLayoutClient from "./ProtectedLayoutClient";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Account suspended</h1>
        <p className="max-w-sm text-sm text-white/60">
          This account cannot buy or send right now. Contact support if you think
          this is a mistake.
        </p>
        <a
          href="/support"
          className="rounded-lg bg-[#744925] px-4 py-2 text-sm font-medium"
        >
          Contact support
        </a>
      </div>
    );
  }

  return (
    <ProtectedLayoutClient userId={user.id}>{children}</ProtectedLayoutClient>
  );
}
