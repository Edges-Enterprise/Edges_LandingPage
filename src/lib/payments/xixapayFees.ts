// src/lib/payments/xixapayFees.ts

/**
 * Xixapay platform fee schedule.
 *
 * Migrated unchanged from the legacy webhook handler
 * (src/app/api/xixa-account/webhook/route.ts `calculateFees`) — same
 * tiers, same amounts. Relocated here so both the deposit webhook and
 * anywhere else that needs to preview/display the fee (e.g. the wallet
 * UI) share one source of truth instead of duplicating the ladder.
 *
 * Unlike Korapay/Flutterwave (flat 2.5%), Xixapay's fee is a fixed
 * amount per bracket of the gross deposit, not a percentage.
 */
export function calculateXixapayFee(grossAmount: number): number {
  if (grossAmount >= 1 && grossAmount <= 9) return 0.2;
  if (grossAmount >= 10 && grossAmount <= 49) return 3;
  if (grossAmount >= 50 && grossAmount <= 99) return 5;
  if (grossAmount >= 100 && grossAmount <= 299) return 10;
  if (grossAmount >= 300 && grossAmount <= 499) return 20;
  if (grossAmount >= 500 && grossAmount <= 999) return 50;
  if (grossAmount >= 1000 && grossAmount <= 1499) return 70;
  if (grossAmount >= 1500 && grossAmount <= 4999) return 100;
  if (grossAmount >= 5000 && grossAmount <= 8999) return 150;
  const steps = Math.floor((grossAmount - 9000) / 4000);
  return 200 + steps * 50;
}

/**
 * Net amount credited to the wallet after the Xixapay platform fee.
 */
export function calculateXixapayNetAmount(grossAmount: number): number {
  return grossAmount - calculateXixapayFee(grossAmount);
}

/**
 * Detailed breakdown for logging/metadata, mirroring the shape used by
 * getFeeBreakdown() in fees.ts (Korapay/Flutterwave) so transaction
 * metadata looks consistent across all three gateways.
 */
export function getXixapayFeeBreakdown(grossAmount: number) {
  const platformFee = calculateXixapayFee(grossAmount);
  const netAmount = grossAmount - platformFee;

  return {
    gross_amount: grossAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
  };
}
