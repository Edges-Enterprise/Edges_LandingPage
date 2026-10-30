// src/lib/store/brandingCooldown.ts

// Brand colour, logo and notification icon are compiled into the customer APK,
// so changing one rebuilds the app. Rebuilds are rate limited to once per 90
// days. Kept out of the "use server" action module, which may only export
// async functions, so both the action and the UI can share this logic.
export const BRANDING_COOLDOWN_DAYS = 90;

export type BrandingField =
  | "brand_color"
  | "logo_url"
  | "notification_icon_url";

export const BRANDING_FIELDS: BrandingField[] = [
  "brand_color",
  "logo_url",
  "notification_icon_url",
];

export interface BrandingLockState {
  locked: boolean;
  lockedUntil: string | null;
  daysRemaining: number;
}

export function computeBrandingLock(
  brandingUpdatedAt: string | null | undefined,
): BrandingLockState {
  if (!brandingUpdatedAt) {
    return { locked: false, lockedUntil: null, daysRemaining: 0 };
  }
  const last = new Date(brandingUpdatedAt).getTime();
  if (Number.isNaN(last)) {
    return { locked: false, lockedUntil: null, daysRemaining: 0 };
  }
  const unlockAt = last + BRANDING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const remaining = unlockAt - Date.now();
  if (remaining <= 0) {
    return { locked: false, lockedUntil: null, daysRemaining: 0 };
  }
  return {
    locked: true,
    lockedUntil: new Date(unlockAt).toISOString(),
    daysRemaining: Math.ceil(remaining / (24 * 60 * 60 * 1000)),
  };
}
