// src/lib/publishing/plans.ts
//
// The publishing plan price list. It lives outside the "use server" action
// module because such a file may only export async functions - exporting the
// plain object from there broke the whole page at import time ("A 'use server'
// file can only export async functions, found object").

export const PUBLISHING_PLAN_PRICES: Record<string, number> = {
  local: 22,
  regional: 28,
  worldwide: 35,
};

export type PublishingPlanId = keyof typeof PUBLISHING_PLAN_PRICES;
