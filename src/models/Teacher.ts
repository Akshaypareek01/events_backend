import mongoose from "mongoose";

/** Teacher accounts: username/password created by admin; used for class dashboard (Zoom links). */
const teacherSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teacherSchema.index({ username: 1 }, { unique: true });

export const Teacher =
  mongoose.models.Teacher ?? mongoose.model("Teacher", teacherSchema);
