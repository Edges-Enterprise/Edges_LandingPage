// src/app/[countryCode]/loading.tsx
import StoreLoader, { PLATFORM_LABEL } from "@/components/common/StoreLoader";

export default function Loading() {
  return <StoreLoader label={PLATFORM_LABEL} />;
}
