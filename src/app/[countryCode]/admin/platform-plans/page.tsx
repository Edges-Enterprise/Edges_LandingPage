// src/app/[countryCode]/admin/platform-plans/page.tsx
//
// The platform-admin surface for the plan catalog and the platform markup.
// Gated SERVER-SIDE: a non-admin gets a not-found, never the data. The page
// deliberately does not inherit the placeholder `[countryCode]/admin/layout`
// gate (there is none) — `getPlatformAdmin` is the gate.

import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/lib/admin/requirePlatformAdmin";
import { listPlatformMarkups, searchPlatformPlans } from "@/app/actions/platform-plans";
import PlatformPlansClient from "./PlatformPlansClient";
import "@/app/reseller.css";

interface PageProps {
  params: Promise<{ countryCode: string }>;
}

export default async function PlatformPlansPage({ params }: PageProps) {
  await params;
  const admin = await getPlatformAdmin();
  if (!admin) notFound();

  const [markups, firstPage] = await Promise.all([
    listPlatformMarkups(),
    searchPlatformPlans({ page: 0, pageSize: 50 }),
  ]);

  return (
    <PlatformPlansClient
      adminEmail={admin.email}
      initialMarkups={markups}
      initialPlans={firstPage.plans}
      initialTotal={firstPage.total}
    />
  );
}
