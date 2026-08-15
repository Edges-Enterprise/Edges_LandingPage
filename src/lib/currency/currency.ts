// src/lib/currency/currency.ts

import { PlanWithConfig } from "@/types/reseller/plans";

/**
 * Currency symbol mapping for all supported currencies
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  // African Currencies
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  UGX: "USh",
  TZS: "TSh",
  RWF: "FRw",
  XAF: "FCFA",
  XOF: "CFA",
  ZAR: "R",
  GMD: "D",
  SLE: "Le",
  AOA: "Kz",
  MGA: "Ar",
  MWK: "MK",
  ZMW: "ZK",
  BWP: "P",
  MZN: "MT",
  NAD: "N$",
  SCR: "SR",
  SZL: "L",
  // Major Currencies
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "$",
  SGD: "S$",
  CHF: "Fr",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  TRY: "₺",
  RUB: "₽",
  KRW: "₩",
  HKD: "HK$",
  MYR: "RM",
  PHP: "₱",
  IDR: "Rp",
  THB: "฿",
  VND: "₫",
  AED: "د.إ",
  SAR: "ر.س",
  QAR: "ر.ق",
  KWD: "د.ك",
  BHD: "ب.د",
  OMR: "ر.ع",
  JOD: "د.ا",
  EGP: "E£",
  MAD: "د.م.",
  TND: "د.ت",
  DZD: "د.ج",
  LYD: "ل.د",
  SDG: "ج.س",
};

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Format a price with the appropriate currency symbol
 */
export function formatPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = amount?.toLocaleString() || "0";
  return `${symbol} ${formattedAmount}`;
}

/**
 * Format a price with fallback
 */
export function formatPriceSafe(
  amount: number | undefined | null,
  currencyCode: string,
): string {
  const safeAmount = amount ?? 0;
  return formatPrice(safeAmount, currencyCode);
}

/**
 * Get the display price for a plan
 */
export function getPlanDisplayPrice(
  plan: PlanWithConfig,
  defaultCurrency: string,
): {
  amount: number;
  currency: string;
  symbol: string;
  formatted: string;
} {
  // For Zendit plans, use send_currency and send_value
  if (plan.provider === "zendit" && plan.send_currency && plan.send_value) {
    const amount = plan.send_value;
    const currency = plan.send_currency;
    return {
      amount,
      currency,
      symbol: getCurrencySymbol(currency),
      formatted: formatPrice(amount, currency),
    };
  }

  // For all other providers, use the plan's currency or fallback
  const amount = plan.base_price;
  const currency = plan.currency || defaultCurrency;

  return {
    amount,
    currency,
    symbol: getCurrencySymbol(currency),
    formatted: formatPrice(amount, currency),
  };
}

/**
 * Get the seller's price (cost and selling price) for a plan
 */
export function getPlanSellerPrice(
  plan: PlanWithConfig,
  defaultCurrency: string,
): {
  cost: number;
  costFormatted: string;
  sellingPrice: number;
  sellingPriceFormatted: string;
  profit: number;
  profitFormatted: string;
  profitPercent: number;
  currency: string;
} {
  const currency = plan.currency || defaultCurrency;
  const cost = plan.base_price;
  const sellingPrice = plan.config?.selling_price ?? cost;
  const profit = sellingPrice - cost;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    cost,
    costFormatted: formatPrice(cost, currency),
    sellingPrice,
    sellingPriceFormatted: formatPrice(sellingPrice, currency),
    profit,
    profitFormatted: formatPrice(profit, currency),
    profitPercent,
    currency,
  };
}

/**
 * Get the local display price for a plan (for reseller dashboard)
 */
export function getPlanLocalPrice(
  plan: PlanWithConfig,
  defaultCurrency: string,
): {
  cost: number;
  costFormatted: string;
  sellingPrice: number;
  sellingPriceFormatted: string;
  profit: number;
  profitFormatted: string;
  profitPercent: number;
  currency: string;
  customerReceives?: string;
} {
  const currency = plan.display_currency || defaultCurrency;

  // If the plan has local pricing data, use it
  if (plan.cost_local !== undefined && plan.cost_local !== null) {
    const cost = plan.cost_local;
    const sellingPrice = plan.selling_price_local ?? cost;
    const profit = sellingPrice - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

    const result = {
      cost,
      costFormatted: formatPrice(cost, currency),
      sellingPrice,
      sellingPriceFormatted: formatPrice(sellingPrice, currency),
      profit,
      profitFormatted: formatPrice(profit, currency),
      profitPercent,
      currency,
    };

    // Add customer receives info for Zendit plans
    if (
      plan.provider === "zendit" &&
      plan.display_send_currency &&
      plan.display_send_amount
    ) {
      return {
        ...result,
        customerReceives: formatPrice(
          plan.display_send_amount,
          plan.display_send_currency,
        ),
      };
    }

    return result;
  }

  // Fallback to base pricing
  return getPlanSellerPrice(plan, defaultCurrency);
}
