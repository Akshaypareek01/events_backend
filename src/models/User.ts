import mongoose from "mongoose";

/** Registrant: payment + approval gates dashboard access. */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    userType: {
      type: String,
      enum: ["normal", "corporate"],
      required: true,
    },
    companyName: { type: String, trim: true },
    /** e.g. acme.com — corporate registrations only */
    companyDomain: { type: String, lowercase: true, trim: true },
    /** @deprecated legacy; use email only for corporate */
    corporateEmail: { type: String, lowercase: true, trim: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "free"],
      required: true,
    },
    isApproved: { type: Boolean, required: true },
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    /** Set when payment is confirmed (Razorpay verify / webhook / admin). */
    paidAt: { type: Date },
    /** Email login OTP (Phase 07) */
    otpHash: { type: String },
    otpExpires: { type: Date },
    /** Throttle OTP emails: last send time, rolling window, count in window */
    otpLastSentAt: { type: Date },
    otpSendWindowStart: { type: Date },
    otpSendsInWindow: { type: Number, default: 0 },
    /** Failed OTP verify attempts; reset on success. */
    otpVerifyFailCount: { type: Number, default: 0 },
    /** After too many bad OTPs, block verify until this time. */
    otpVerifyLockedUntil: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ razorpayOrderId: 1 }, { sparse: true });

export const User =
  mongoose.models.User ?? mongoose.model("User", userSchema);
