// src/lib/currency/exchangeRate.ts

// USD -> local currency rate, used to show a reseller what a USD price costs
// in the money that actually leaves their wallet. Same provider and hourly
// cache as the plans catalog (src/actions/reseller/plans/getPlans.ts).
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedRates: Record<string, number> = {};
let lastFetch = 0;

export async function getUsdToLocalRate(
  localCurrency: string,
): Promise<number | null> {
  if (!localCurrency) return null;
  if (localCurrency.toUpperCase() === "USD") return 1;

  const now = Date.now();
  if (now - lastFetch > CACHE_TTL_MS || Object.keys(cachedRates).length === 0) {
    try {
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD",
        { cache: "no-store" },
      );
      if (response.ok) {
        const data = await response.json();
        cachedRates = data?.rates || {};
        lastFetch = now;
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
    }
  }

  const rate = cachedRates[localCurrency.toUpperCase()];
  return typeof rate === "number" && rate > 0 ? rate : null;
}
