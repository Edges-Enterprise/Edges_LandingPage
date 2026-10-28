// src/app/[countryCode]/[storeName]/StoreLoadingIndicator.tsx
"use client";

import { useParams } from "next/navigation";
import StoreLoader, { storeLabel } from "@/components/common/StoreLoader";

/**
 * Client half of the storefront's loading boundary.
 *
 * `loading.tsx` cannot name the store: unlike a layout, Next.js passes it no
 * `params`, so it has no slug to read. This reads the segment from the URL
 * instead, which is available to a client component immediately.
 */
export default function StoreLoadingIndicator() {
  const params = useParams<{ storeName?: string }>();

  return <StoreLoader label={storeLabel(null, params?.storeName)} />;
}
