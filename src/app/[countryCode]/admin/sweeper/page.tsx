// src/app/[countryCode]/admin/sweeper/page.tsx
//
// Platform-admin sweeper page. Gated SERVER-SIDE: a non-admin gets a
// not-found, never the balance. Follows the `platform-plans` precedent — the
// `[countryCode]/admin/layout` is a placeholder with no auth check, so
// `getPlatformAdmin` is the gate, and every action re-checks it.
//
// The sweeper is platform-wide (one Xixapay account serves every storefront),
// so `countryCode` is context for the admin rather than a filter on the money.

import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/lib/admin/requirePlatformAdmin";
import { getSweeperState } from "@/app/actions/xixapay-sweeper";
import SweeperClient from "./SweeperClient";
import "@/app/reseller.css";

interface PageProps {
  params: Promise<{ countryCode: string }>;
}

export default async function SweeperPage({ params }: PageProps) {
  const { countryCode } = await params;

  const admin = await getPlatformAdmin();
  if (!admin) notFound();

  const state = await getSweeperState();
  if (!state.success) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
          Sweeper unavailable
        </h2>
        <p style={{ color: "var(--dim)", marginTop: "0.5rem" }}>{state.error}</p>
      </div>
    );
  }

  return (
    <SweeperClient
      countryCode={countryCode}
      adminEmail={admin.email}
      initialState={state}
    />
  );
}
