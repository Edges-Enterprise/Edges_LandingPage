// src/lib/store/reservedSlugs.ts
//
// Store slugs that cannot be used because they collide with a route, or
// because they would let a tenant trade on the platform's own name.
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

/**
 * Fragments that may not appear anywhere in a slug, as a prefix, suffix or
 * infix.
 *
 * These are brand and impersonation guards rather than routing guards: a slug
 * like "edgesupport" reads as an official channel, and a phishing storefront
 * at /ng/edgesupport would be indistinguishable from the platform's own to a
 * customer who only reads the URL. Substring matching (not a fixed list of
 * whole slugs) is deliberate - the space of "edge"-prefixed names is
 * unbounded, so an allowlist of exact names would always lag behind.
 */
export const RESERVED_STORE_SLUG_FRAGMENTS: readonly string[] = ["edge"];

const RESERVED = new Set(RESERVED_STORE_SLUGS);

/** True when the slug contains a reserved brand fragment. */
export function isBrandReservedStoreSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return RESERVED_STORE_SLUG_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

/**
 * True when the slug would collide with a platform route, or contains a
 * reserved brand fragment.
 */
export function isReservedStoreSlug(slug: string): boolean {
  return (
    RESERVED.has(slug.trim().toLowerCase()) || isBrandReservedStoreSlug(slug)
  );
}

/**
 * The canonical slug format. Shared by the availability check and the
 * submission action so the two cannot disagree about what is acceptable.
 */
export const STORE_SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Full validation, format first, then reserved names.
 *
 * Returns the user-facing error, or null when the slug is acceptable. The
 * database checks live in the callers, since only they hold a client.
 *
 * The brand case gets its own message: the slug is derived from the store name,
 * so a tenant called "Edge Telecom" hits this without having typed anything
 * odd, and "reserved" alone would read as a bug rather than a rule.
 */
export function validateStoreSlugFormat(slug: string): string | null {
  if (!slug || slug.length < 3) {
    return "Store name must be at least 3 characters";
  }

  if (!STORE_SLUG_PATTERN.test(slug)) {
    return "Only lowercase letters, numbers, and hyphens allowed";
  }

  if (isBrandReservedStoreSlug(slug)) {
    return "Store names cannot contain \u201cedge\u201d. Please choose another.";
  }

  if (isReservedStoreSlug(slug)) {
    return "This store name is reserved. Please choose another.";
  }

  return null;
}
