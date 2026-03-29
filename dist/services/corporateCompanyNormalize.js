/** Normalize coupon codes for comparison (trim + uppercase). */
export function normalizeCouponCode(raw) {
    return raw.trim().toUpperCase();
}
