import mongoose from "mongoose";

/** Singleton-style program metadata (price label, duration). */
const programConfigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    priceInr: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    notes: { type: String, trim: true },
    /** Work-email domains that get complimentary corporate access (lowercase, no @). */
    allowedCorporateDomains: { type: [String], default: [] },
    /**
     * Admin-controlled banner shown on dashboards.
     * If message is empty, the banner is hidden.
     */
    dashboardAlertMessage: { type: String, trim: true },
    dashboardAlertColor: {
      type: String,
      enum: ["info", "success", "warning", "danger"],
      default: "info",
    },
  },
  { timestamps: true },
);

export const ProgramConfig =
  mongoose.models.ProgramConfig ??
  mongoose.model("ProgramConfig", programConfigSchema);
