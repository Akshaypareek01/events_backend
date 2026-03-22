import crypto from "crypto";
/** Verifies payment signature from Checkout `handler` response. */
export function verifyPaymentSignature(params) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret)
        return false;
    const body = `${params.orderId}|${params.paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    return expected === params.signature;
}
/** Verifies Razorpay webhook raw body (HMAC SHA256 of payload). */
export function verifyWebhookSignature(rawBody, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signature)
        return false;
    const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
    return expected === signature;
}
