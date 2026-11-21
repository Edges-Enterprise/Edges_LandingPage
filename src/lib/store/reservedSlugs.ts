// src/lib/store/reservedSlugs.ts
//
// Store slugs that cannot be used because they collide with a route.
//
// A store lives at /[countryCode]/[storeName]. Next.js resolves a static
// segment before a dynamic one, so a store whose slug is "privacy" would be
// shadowed by /[countryCode]/privacy and become unreachable - and the visitor
// would silently land on the platform's policy instead of the store.
//
// Keep this in step with the directories under src/app/[countryCode]/.
export const RESERVED_STORE_SLUGS: readonly string[] = [
  "privacy",
  "terms",
  "admin",
  "apply",
  "dashboard",
  "launch",
  "sign-in",
  "sign-up",
  "status",
  "success",
  "verify",
  "generateIcon.ts",
  "loading.tsx",
  "layout.tsx",
  "page.tsx",
];

const RESERVED = new Set(RESERVED_STORE_SLUGS);

/** True when the slug would collide with a platform route. */
export function isReservedStoreSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}
