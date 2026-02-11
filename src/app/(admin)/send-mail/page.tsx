// app/(admin)/send-mail/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createServerClient } from "@/lib/supabase/server";
import AdminEmailPage from "./AdminEmailPage";

export default async function SendMailRoute() {
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/notification"); // or wherever non-admins go, yh
  }

  return <AdminEmailPage />;
}
