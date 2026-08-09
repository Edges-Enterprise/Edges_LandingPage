// src/lib/payments/fees.ts

/**
 * Korapay's fee rate (1.5%)
 */
export const KORAPAY_FEE_RATE = 0.015;

/**
 * Platform markup rate (2.5%)
 */
export const PLATFORM_MARKUP_RATE = 0.025;

/**
 * Total fee rate (4%)
 */
export const TOTAL_FEE_RATE = 0.04; // 1.5% + 2.5%

/**
 * Calculate total fees for a transaction
 * Total fee = 4% of the gross amount
 */
export function calculateTotalFees(amount: number): number {
  return amount * TOTAL_FEE_RATE;
}

/**
 * Calculate the net amount after all fees
 * User receives 96% of the deposit
 */
export function calculateNetAmount(amount: number): number {
  return amount - calculateTotalFees(amount);
}

/**
 * Get detailed fee breakdown
 */
export function getFeeBreakdown(amount: number) {
  const korapayFee = amount * KORAPAY_FEE_RATE;
  const platformFee = amount * PLATFORM_MARKUP_RATE;
  const totalFee = amount * TOTAL_FEE_RATE;
  const netAmount = amount - totalFee;

  return {
    gross_amount: amount,
    korapay_fee: korapayFee,
    platform_fee: platformFee,
    total_fee: totalFee,
    net_amount: netAmount,
    korapay_fee_percent: `${(KORAPAY_FEE_RATE * 100).toFixed(1)}%`,
    platform_fee_percent: `${(PLATFORM_MARKUP_RATE * 100).toFixed(1)}%`,
    total_fee_percent: `${(TOTAL_FEE_RATE * 100).toFixed(1)}%`,
  };
}

