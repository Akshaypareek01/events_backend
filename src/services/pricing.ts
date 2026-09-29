/** Listed program price is already GST-inclusive. Do not add tax on top. */
export function computeIndividualPayableInr(priceInrInclusive: number): number {
  return Number(priceInrInclusive.toFixed(2));
}

/** Convert INR to paise with proper rounding for gateway amounts. */
export function inrToPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

/** Default checkout amount in INR, GST included. */
export const INCLUSIVE_PRICE_INR = 199;
