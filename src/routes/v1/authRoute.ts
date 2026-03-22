import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { User } from "../../models/User.js";
import { sendMailSafe } from "../../services/email.js";
import { otpLoginEmail } from "../../services/emailTemplates.js";
import { signUserToken } from "../../services/authJwt.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../services/otp.js";
import { canAccessProgram } from "../../services/access.js";
import {
  applyOtpSend,
  checkOtpSendAllowed,
  clearOtpRateFields,
} from "../../services/otpRateLimit.js";
import { z } from "zod";

const OTP_MAX_VERIFY_FAILS = 5;
const OTP_VERIFY_LOCK_MS = 15 * 60 * 1000;

/** Fallback IP cap (per-route); per-email limits live on the user doc. */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const requestSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const authRouter = Router();

authRouter.post(
  "/auth/request-otp",
  otpLimiter,
  asyncHandler(async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid email", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    if (!user) {
      throw new ApiError(404, "No account for this email", { code: "NOT_FOUND" });
    }
    if (!canAccessProgram(user)) {
      throw new ApiError(403, "Complete payment or wait for approval", {
        code: "NO_ACCESS",
      });
    }

    const rate = checkOtpSendAllowed(user);
    if (!rate.ok) {
      throw new ApiError(429, rate.deny.message, {
        code: "RATE_LIMIT",
        details: { retryAfterSec: rate.deny.retryAfterSec },
      });
    }

    const otp = generateOtp();
    user.otpHash = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpVerifyFailCount = 0;
    user.otpVerifyLockedUntil = undefined;
    applyOtpSend(user);
    await user.save();

    const mail = otpLoginEmail({ otp });
    await sendMailSafe({ to: user.email, ...mail });

    res.json({ ok: true });
  }),
);

authRouter.post(
  "/auth/verify-otp",
  otpLimiter,
  asyncHandler(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    if (!user?.otpHash || !user.otpExpires) {
      throw new ApiError(400, "Request a code first", { code: "NO_OTP" });
    }
    if (user.otpVerifyLockedUntil && user.otpVerifyLockedUntil.getTime() > Date.now()) {
      throw new ApiError(429, "Too many incorrect codes. Wait a few minutes or request a new code.", {
        code: "OTP_LOCKED",
      });
    }
    if (user.otpExpires.getTime() < Date.now()) {
      throw new ApiError(400, "Code expired", { code: "EXPIRED" });
    }
    if (!verifyOtpHash(parsed.data.otp, user.otpHash)) {
      user.otpVerifyFailCount = (user.otpVerifyFailCount ?? 0) + 1;
      if (user.otpVerifyFailCount >= OTP_MAX_VERIFY_FAILS) {
        user.otpVerifyLockedUntil = new Date(Date.now() + OTP_VERIFY_LOCK_MS);
      }
      await user.save();
      throw new ApiError(400, "Invalid code", { code: "BAD_OTP" });
    }

    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpVerifyFailCount = 0;
    user.otpVerifyLockedUntil = undefined;
    clearOtpRateFields(user);
    await user.save();

    const token = signUserToken(user._id.toString());
    res.json({ token, userId: user._id.toString() });
  }),
);
