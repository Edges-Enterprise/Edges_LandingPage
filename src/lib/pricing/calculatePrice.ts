// lib/pricing/calculatePrice.ts

/**
 * Calculate the final reseller selling price
 */
export function calculateResellerPrice(
  basePrice: number,
  markupType: 'fixed' | 'percentage',
  markupValue: number
): number {
  if (markupType === 'percentage') {
    return Math.round(basePrice * (1 + markupValue / 100))
  }
  return Math.round(basePrice + markupValue)
}

/**
 * Calculate profit from a sale
 */
export function calculateProfit(sellingPrice: number, basePrice: number): number {
  return sellingPrice - basePrice
}

/**
 * Format number as Nigerian Naira currency string
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

/**
 * Calculate what percentage the markup represents
 */
export function calculateMarkupPercentage(basePrice: number, sellingPrice: number): number {
  if (basePrice <= 0) return 0
  return Math.round(((sellingPrice - basePrice) / basePrice) * 100)
}

/**
 * Calculate the 2% withdrawal fee
 */
export function calculateWithdrawalFee(amount: number): number {
  return Math.round(amount * 0.02)
}

/**
 * Calculate net withdrawal amount after fee
 */
export function calculateNetWithdrawal(amount: number): number {
  return amount - calculateWithdrawalFee(amount)
}