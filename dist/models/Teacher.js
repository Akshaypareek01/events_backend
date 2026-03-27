import mongoose from "mongoose";
/** Teacher accounts: username/password created by admin; used for class dashboard (Zoom links). */
const teacherSchema = new mongoose.Schema({
    username: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: "" },
    /** Optional; used to email login credentials when admin creates the account. */
    email: { type: String, lowercase: true, trim: true },
    active: { type: Boolean, default: true },
}, { timestamps: true });
teacherSchema.index({ username: 1 }, { unique: true });
teacherSchema.index({ email: 1 }, { unique: true, sparse: true });
export const Teacher = mongoose.models.Teacher ?? mongoose.model("Teacher", teacherSchema);
