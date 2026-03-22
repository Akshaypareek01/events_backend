import mongoose from "mongoose";

/** Admin login for panel (Phase 09); credentials issued via seed or manual insert. */
const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
  },
  { timestamps: true },
);

adminUserSchema.index({ email: 1 }, { unique: true });

export const AdminUser =
  mongoose.models.AdminUser ?? mongoose.model("AdminUser", adminUserSchema);
