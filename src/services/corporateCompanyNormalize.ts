/** Normalize coupon codes for comparison (trim + uppercase). */

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}
