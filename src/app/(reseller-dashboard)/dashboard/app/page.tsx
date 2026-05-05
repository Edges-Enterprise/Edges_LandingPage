

// // app/(reseller-dashboard)/dashboard/app/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppBuildClient } from "./AppBuildClient";

export default async function AppBuildPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/reseller");

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, android_app, store_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!reseller) redirect("/reseller");
  if (!reseller.android_app) redirect("/dashboard");

  const { data: buildConfig } = await supabase
    .from("reseller_app_configs")
    .select("*")
    .eq("reseller_id", reseller.id)
    .single();

  return <AppBuildClient resellerId={reseller.id} buildConfig={buildConfig} />;
}

// import { createServerClient } from "@/lib/supabase/server";
// import { redirect } from "next/navigation";
// import { AppBuildClient } from "./AppBuildClient";

// export default async function AppBuildPage() {
//   const supabase = await createServerClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) redirect("/reseller");

//   const { data: reseller } = await supabase
//     .from("resellers")
//     .select("id, android_app")
//     .eq("auth_user_id", user.id)
//     .single();

//   if (!reseller) redirect("/reseller");
//   if (!reseller.android_app) redirect("/dashboard");

//   const { data: buildConfig } = await supabase
//     .from("reseller_app_configs")
//     .select("*")
//     .eq("reseller_id", reseller.id)
//     .single();

//   return <AppBuildClient resellerId={reseller.id} buildConfig={buildConfig} />;
// }
