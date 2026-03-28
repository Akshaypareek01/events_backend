const GST_RATE = 0.18;
/** Base + GST total payable amount for individual users. */
export function computeIndividualPayableInr(basePriceInr) {
    return Number((basePriceInr * (1 + GST_RATE)).toFixed(2));
}
/** Convert INR to paise with proper rounding for gateway amounts. */
export function inrToPaise(amountInr) {
    return Math.round(amountInr * 100);
}
export const PRICING = {
    GST_RATE,
};
