// app/(store)/[storeName]/page.tsx

import { notFound } from "next/navigation";
import { StoreContent } from "./StoreContent";
import type { StorePlan } from "@/types";
import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
import { getStorePlans } from "@/app/actions/reseller/plans/getPlans";

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeName: string }>;
}) {
  const { storeName } = await params;

  const reseller = await getResellerByStoreName(storeName);
  if (!reseller) notFound();

  const dataPlans = await getStorePlans(storeName, "data");
  const airtimePlans = await getStorePlans(storeName, "airtime");

  // Get top 3 data plans for featured section
  const featuredPlans = dataPlans.slice(0, 3);

  const themeColors = {
    light: {
      primary: "#2563EB",
      from: "#2563EB",
      to: "#1D4ED8",
      bg: "#EFF6FF",
    },
    dark: {
      primary: "#1F2937",
      from: "#1F2937",
      to: "#111827",
      bg: "#F3F4F6",
    },
    custom: {
      primary: "#7C3AED",
      from: "#7C3AED",
      to: "#5B21B6",
      bg: "#F5F3FF",
    },
  };

  const colors = themeColors[reseller.theme] || themeColors.light;
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
      dataPlans={dataPlans}
      airtimePlans={airtimePlans}
    />
  );
}
