import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { User } from "../../models/User.js";
import { sendMailSafe } from "../../services/email.js";
import { paymentSuccessEmail } from "../../services/emailTemplates.js";
import { getProgramMeta } from "../../services/programConfig.js";
import { getRazorpay } from "../../services/razorpayClient.js";
import { verifyPaymentSignature } from "../../services/razorpayVerify.js";
import {
  tryGetUserIdFromUserBearer,
  verifyPayToken,
} from "../../services/authJwt.js";
import { z } from "zod";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const createOrderSchema = z.object({
  userId: z.string().min(1),
  /** From registration email / redirect; OR omit when using logged-in user JWT. */
  payToken: z.string().min(20).optional(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const paymentsRouter = Router();

paymentsRouter.post(
  "/payments/create-order",
  limiter,
  asyncHandler(async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const { userId, payToken } = parsed.data;
    const bearerUserId = tryGetUserIdFromUserBearer(req.headers.authorization);
    const payClaims = payToken ? verifyPayToken(payToken) : null;
    const tokenMatches = payClaims?.sub === userId;
    if (bearerUserId !== userId && !tokenMatches) {
      throw new ApiError(403, "Use the payment link from your email, or log in and open Pay from your dashboard.", {
        code: "PAY_AUTH_REQUIRED",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", { code: "NOT_FOUND" });
    }
    if (user.userType !== "normal") {
      throw new ApiError(400, "Payment not required for this account", {
        code: "NO_PAYMENT",
      });
    }
    if (user.paymentStatus === "paid") {
      throw new ApiError(400, "Already paid", { code: "ALREADY_PAID" });
    }

    const { priceInr, currency } = await getProgramMeta();
    const amountPaise = Math.round(priceInr * 100);

    let rzp;
    try {
      rzp = getRazorpay();
    } catch {
      throw new ApiError(503, "Payment gateway not configured", {
        code: "RAZORPAY_CONFIG",
      });
    }
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency,
      receipt: `u_${user._id.toString().slice(-8)}`,
      notes: { userId: user._id.toString() },
    });

    user.razorpayOrderId = order.id;
    await user.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  }),
);

paymentsRouter.post(
  "/payments/verify",
  limiter,
  asyncHandler(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      parsed.data;

    const ok = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!ok) {
      throw new ApiError(400, "Invalid signature", { code: "BAD_SIGNATURE" });
    }

    const resolved = await User.findOne({ razorpayOrderId: razorpay_order_id });
    if (!resolved) {
      throw new ApiError(404, "Order not linked to user", { code: "NO_USER" });
    }

    if (resolved.paymentStatus !== "paid") {
      resolved.paymentStatus = "paid";
      resolved.isApproved = true;
      resolved.razorpayPaymentId = razorpay_payment_id;
      resolved.paidAt = new Date();
      await resolved.save();

      const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
      const meta = await getProgramMeta();
      const mail = paymentSuccessEmail({
        name: resolved.name,
        dashboardUrl: `${webOrigin}/dashboard`,
        programTitle: meta.title,
      });
      await sendMailSafe({ to: resolved.email, ...mail });
    }

    res.json({ ok: true, userId: resolved._id.toString() });
  }),
);
