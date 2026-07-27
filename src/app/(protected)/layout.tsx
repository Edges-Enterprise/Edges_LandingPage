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

  return (
    <ProtectedLayoutClient userId={user.id}>{children}</ProtectedLayoutClient>
  );
}
