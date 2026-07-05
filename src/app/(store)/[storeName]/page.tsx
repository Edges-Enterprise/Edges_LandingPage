// app/(store)/[storeName]/page.tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { StoreContent } from "./StoreContent";
import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";
import { getStoreAsset } from "@/app/actions/reseller/getStoreAsset";
import { createAdminClient } from "@/lib/supabase/admin";  // ← This is what you need


/** Slightly darken a hex colour — used server-side for gradient end stop */
function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Very light tint for the page background */
function tintBg(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const blend = (c: number) => Math.round(c * 0.06 + 255 * 0.94);
  const rr = blend(r).toString(16).padStart(2, "0");
  const gg = blend(g).toString(16).padStart(2, "0");
  const bb = blend(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

// Generate dynamic metadata for each store
export async function generateMetadata(
  { params }: { params: Promise<{ storeName: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { storeName } = await params;
  const headersList = await headers();

  const host = headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const reseller = await getResellerByStoreName(storeName);
  if (!reseller) {
    return {
      title: "Store Not Found",
      description: "The requested store could not be found.",
    };
  }

  const displayName = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const storeIcon = await getStoreAsset(reseller.id);
  const faviconUrl = `${baseUrl}/api/store/${storeName}/favicon`;

  return {
    title: `${displayName} | Data & Airtime Store`,
    description: `Buy data and airtime from ${displayName}. Fast, reliable, and affordable.`,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    openGraph: {
      title: `${displayName} - Data & Airtime Store`,
      description: `Buy data and airtime from ${displayName}. Fast, reliable, and affordable.`,
      images: storeIcon?.url ? [storeIcon.url] : [],
      type: "website",
    },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeName: string }>;
}) {
  const { storeName } = await params;

  const reseller = await getResellerByStoreName(storeName);
  if (!reseller) notFound();

  // ✅ Use your existing admin client
  const supabaseAdmin = createAdminClient();

  // ─── Fetch APK URL for this specific reseller ───
  const { data: appConfig } = await supabaseAdmin
    .from("reseller_app_configs")
    .select("apk_url")
    .eq("reseller_id", reseller.id)
    .maybeSingle();

  const apkUrl = appConfig?.apk_url || null;

  const allPlans = await getStorePlans(storeName);
  const mtnPlans = allPlans.filter((p) => p.network === "MTN");
  const featuredPlans = mtnPlans.slice(0, 3);

  const primary: string = reseller.theme ?? "#2563EB";
  const colors = {
    primary,
    from: primary,
    to: darken(primary, 30),
    bg: tintBg(primary),
  };

  const storeIcon = await getStoreAsset(reseller.id);
  const displayName = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <StoreContent
      storeName={storeName}
      displayName={displayName}
      colors={colors}
      featuredPlans={featuredPlans}
      allPlans={allPlans}
      storeIcon={storeIcon}
      apkUrl={apkUrl}
    />
  );
}

// // app/(store)/[storeName]/page.tsx
// import { headers } from "next/headers";
// import { notFound } from "next/navigation";
// import type { Metadata, ResolvingMetadata } from "next";
// import { StoreContent } from "./StoreContent";
// import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
// import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";
// import { getStoreAsset } from "@/app/actions/reseller/getStoreAsset";
// import { createServerClient } from "@/lib/supabase/server";

// /** Slightly darken a hex colour — used server-side for gradient end stop */
// function darken(hex: string, amt = 30): string {
//   const n = parseInt(hex.replace("#", ""), 16);
//   const r = Math.max(0, ((n >> 16) & 0xff) - amt);
//   const g = Math.max(0, ((n >> 8) & 0xff) - amt);
//   const b = Math.max(0, (n & 0xff) - amt);
//   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// }

// /** Very light tint for the page background */
// function tintBg(hex: string): string {
//   const n = parseInt(hex.replace("#", ""), 16);
//   const r = (n >> 16) & 0xff;
//   const g = (n >> 8) & 0xff;
//   const b = n & 0xff;
//   const blend = (c: number) => Math.round(c * 0.06 + 255 * 0.94);
//   const rr = blend(r).toString(16).padStart(2, "0");
//   const gg = blend(g).toString(16).padStart(2, "0");
//   const bb = blend(b).toString(16).padStart(2, "0");
//   return `#${rr}${gg}${bb}`;
// }

// // Generate dynamic metadata for each store
// export async function generateMetadata(
//   { params }: { params: Promise<{ storeName: string }> },
//   parent: ResolvingMetadata,
// ): Promise<Metadata> {
//   const { storeName } = await params;
//   const headersList = await headers();

//   // Detect actual host from request headers
//   const host = headersList.get("host") || "";
//   const proto = headersList.get("x-forwarded-proto") || "https";
//   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

//   const reseller = await getResellerByStoreName(storeName);
//   if (!reseller) {
//     return {
//       title: "Store Not Found",
//       description: "The requested store could not be found.",
//     };
//   }

//   const displayName = storeName
//     .split("-")
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(" ");

//   const storeIcon = await getStoreAsset(reseller.id);

//   // Build the favicon URL
//   // const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
//   const faviconUrl = `${baseUrl}/api/store/${storeName}/favicon`;

//   return {
//     title: `${displayName} | Data & Airtime Store`,
//     description: `Buy data and airtime from ${displayName}. Fast, reliable, and affordable.`,
//     icons: {
//       icon: faviconUrl,
//       shortcut: faviconUrl,
//       apple: faviconUrl,
//     },
//     openGraph: {
//       title: `${displayName} - Data & Airtime Store`,
//       description: `Buy data and airtime from ${displayName}. Fast, reliable, and affordable.`,
//       images: storeIcon?.url ? [storeIcon.url] : [],
//       type: "website",
//     },
//   };
// }

// export default async function StorePage({
//   params,
// }: {
//   params: Promise<{ storeName: string }>;
// }) {
//   const { storeName } = await params;

//   const reseller = await getResellerByStoreName(storeName);
//   if (!reseller) notFound();

// // ✅ Use service role client to bypass RLS
// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

//   // ─── Fetch APK URL for this specific reseller ───
//   const supabase = await createServerClient();
//   const { data: appConfig } = await supabaseAdmin
//     .from("reseller_app_configs")
//     .select("apk_url")
//     .eq("reseller_id", reseller.id)
//     .maybeSingle();

//   const apkUrl = appConfig?.apk_url || null;

//   const allPlans = await getStorePlans(storeName);
//   const mtnPlans = allPlans.filter((p) => p.network === "MTN");
//   const featuredPlans = mtnPlans.slice(0, 3);

//   const primary: string = reseller.theme ?? "#2563EB";
//   const colors = {
//     primary,
//     from: primary,
//     to: darken(primary, 30),
//     bg: tintBg(primary),
//   };

//   const storeIcon = await getStoreAsset(reseller.id);
//   const displayName = storeName
//     .split("-")
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(" ");

//   return (
//     <StoreContent
//       storeName={storeName}
//       displayName={displayName}
//       colors={colors}
//       featuredPlans={featuredPlans}
//       allPlans={allPlans}
//       storeIcon={storeIcon}
//       apkUrl={apkUrl}
//     />
//   );
// }
