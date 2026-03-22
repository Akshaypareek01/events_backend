/** Min delay between OTP emails for the same user. */
export const OTP_MIN_GAP_MS = 60_000;

/** Rolling window length for counting OTP send attempts. */
export const OTP_WINDOW_MS = 60 * 60 * 1000;

/** Max OTP send requests per window (initial send + resends). */
export const OTP_MAX_SENDS_PER_WINDOW = 3;

export type OtpRateFields = {
  otpLastSentAt?: Date | null;
  otpSendWindowStart?: Date | null;
  otpSendsInWindow?: number | null;
};

export type OtpRateDeny = {
  message: string;
  retryAfterSec: number;
};

/**
 * Returns whether another OTP email is allowed; does not mutate the user doc.
 */
export function checkOtpSendAllowed(state: OtpRateFields): { ok: true } | { ok: false; deny: OtpRateDeny } {
  const now = Date.now();
  const last = state.otpLastSentAt ? new Date(state.otpLastSentAt).getTime() : 0;
  if (last && now - last < OTP_MIN_GAP_MS) {
    const retryAfterSec = Math.ceil((OTP_MIN_GAP_MS - (now - last)) / 1000);
    return {
      ok: false,
      deny: {
        message: `Wait ${retryAfterSec}s before requesting another code.`,
        retryAfterSec,
      },
    };
  }

  let windowStart = state.otpSendWindowStart ? new Date(state.otpSendWindowStart).getTime() : 0;
  let count = state.otpSendsInWindow ?? 0;
  if (!windowStart || now - windowStart > OTP_WINDOW_MS) {
    windowStart = now;
    count = 0;
  }

  if (count >= OTP_MAX_SENDS_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((windowStart + OTP_WINDOW_MS - now) / 1000));
    const mins = Math.max(1, Math.ceil(retryAfterSec / 60));
    return {
      ok: false,
      deny: {
        message: `Too many code requests. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`,
        retryAfterSec,
      },
    };
  }

  return { ok: true };
}

/**
 * Updates rate fields after a successful OTP send (call after check passes).
 */
export function applyOtpSend(state: OtpRateFields): void {
  const now = Date.now();
  let windowStart = state.otpSendWindowStart ? new Date(state.otpSendWindowStart).getTime() : 0;
  let count = state.otpSendsInWindow ?? 0;
  if (!windowStart || now - windowStart > OTP_WINDOW_MS) {
    windowStart = now;
    count = 0;
  }
  state.otpSendWindowStart = new Date(windowStart);
  state.otpSendsInWindow = count + 1;
  state.otpLastSentAt = new Date(now);
}

/** Clear rate counters after successful login. */
export function clearOtpRateFields(state: OtpRateFields): void {
  state.otpLastSentAt = undefined;
  state.otpSendWindowStart = undefined;
  state.otpSendsInWindow = undefined;
}
