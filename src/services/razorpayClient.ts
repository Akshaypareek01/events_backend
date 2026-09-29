import Razorpay from "razorpay";

/** True only when the API process is started with NODE_ENV=production. */
function useLiveRazorpay(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Public key. Local (`npm run dev`) uses `TEST_RAZORPAY_KEY_ID`.
 * Production uses `RAZORPAY_KEY_ID`.
 */
export function razorpayKeyId(): string | undefined {
  const id = useLiveRazorpay()
    ? process.env.RAZORPAY_KEY_ID?.trim()
    : process.env.TEST_RAZORPAY_KEY_ID?.trim();
  return id || undefined;
}

/**
 * Secret paired with `razorpayKeyId`.
 * Local: `TEST_RAZORPAY_SECRET`. Production: `RAZORPAY_SECRET` (or `RAZORPAY_KEY_SECRET`).
 */
export function razorpayKeySecret(): string | undefined {
  const secret = useLiveRazorpay()
    ? process.env.RAZORPAY_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim()
    : process.env.TEST_RAZORPAY_SECRET?.trim();
  return secret || undefined;
}

/** Razorpay SDK client. Throws if key id or secret is missing. */
export function getRazorpay(): Razorpay {
  const key_id = razorpayKeyId();
  const key_secret = razorpayKeySecret();
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_SECRET must be set");
  }
  return new Razorpay({ key_id, key_secret });
}
