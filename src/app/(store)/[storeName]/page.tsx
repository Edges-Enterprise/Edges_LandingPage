// app/(store)/[storeName]/page.tsx

import { notFound } from "next/navigation";
import { StoreContent } from "./StoreContent";
import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";

/** Slightly darken a hex colour — used server-side for gradient end stop */
function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - amt);
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
  // Blend toward white at 95 %
  const blend = (c: number) => Math.round(c * 0.06 + 255 * 0.94);
  const rr = blend(r).toString(16).padStart(2, "0");
  const gg = blend(g).toString(16).padStart(2, "0");
  const bb = blend(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeName: string }>;
}) {
  const { storeName } = await params;

  const reseller = await getResellerByStoreName(storeName);
  if (!reseller) notFound();

  // All plans — no network filter
  const allPlans = await getStorePlans(storeName);

  // Featured = cheapest 3 MTN plans for the hero cards
  const mtnPlans = allPlans.filter((p) => p.network === "MTN");
  const featuredPlans = mtnPlans.slice(0, 3);

  // Derive color palette from the stored hex value.
  // Falls back to brand blue if the field isn't present yet.
  // With this:
  const primary: string = reseller.theme ?? "#2563EB";
  const colors = {
    primary,
    from: primary,
    to: darken(primary, 30),
    bg: tintBg(primary),
  };

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
    />
  );
}

// import { notFound } from "next/navigation";
// import { StoreContent } from "./StoreContent";
// import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
// import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";

// export default async function StorePage({
//   params,
// }: {
//   params: Promise<{ storeName: string }>;
// }) {
//   const { storeName } = await params;

//   const reseller = await getResellerByStoreName(storeName);
//   if (!reseller) notFound();

//   // Get all plans (no network filter — show everything)
//   const allPlans = await getStorePlans(storeName);

//   // Get featured plans (cheapest 3 from MTN for the hero section)
//   const mtnPlans = allPlans.filter((p) => p.network === "MTN");
//   const featuredPlans = mtnPlans.slice(0, 3);

//   const themeColors = {
//     light: {
//       primary: "#2563EB",
//       from: "#2563EB",
//       to: "#1D4ED8",
//       bg: "#EFF6FF",
//     },
//     dark: { primary: "#1F2937", from: "#1F2937", to: "#111827", bg: "#F3F4F6" },
//     custom: {
//       primary: "#7C3AED",
//       from: "#7C3AED",
//       to: "#5B21B6",
//       bg: "#F5F3FF",
//     },
//   };

//   const colors = themeColors[reseller.theme] || themeColors.light;
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
//     />
//   );
// }

// // // app/(store)/[storeName]/page.tsx

// // import { notFound } from "next/navigation";
// // import { StoreContent } from "./StoreContent";
// // import type { StorePlan } from "@/types";
// // import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
// // import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";

// // export default async function StorePage({
// //   params,
// // }: {
// //   params: Promise<{ storeName: string }>;
// // }) {
// //   const { storeName } = await params;

// //   const reseller = await getResellerByStoreName(storeName);
// //   if (!reseller) notFound();

// //   const dataPlans = await getStorePlans(storeName, "data");
// //   const airtimePlans = await getStorePlans(storeName, "airtime");

// //   // Get top 3 data plans for featured section
// //   const featuredPlans = dataPlans.slice(0, 3);

// //   const themeColors = {
// //     light: {
// //       primary: "#2563EB",
// //       from: "#2563EB",
// //       to: "#1D4ED8",
// //       bg: "#EFF6FF",
// //     },
// //     dark: {
// //       primary: "#1F2937",
// //       from: "#1F2937",
// //       to: "#111827",
// //       bg: "#F3F4F6",
// //     },
// //     custom: {
// //       primary: "#7C3AED",
// //       from: "#7C3AED",
// //       to: "#5B21B6",
// //       bg: "#F5F3FF",
// //     },
// //   };

// //   const colors = themeColors[reseller.theme] || themeColors.light;
// //   const displayName = storeName
// //     .split("-")
// //     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
// //     .join(" ");

// //   return (
// //     <StoreContent
// //       storeName={storeName}
// //       displayName={displayName}
// //       colors={colors}
// //       featuredPlans={featuredPlans}
// //       dataPlans={dataPlans}
// //       airtimePlans={airtimePlans}
// //     />
// //   );
// // }
