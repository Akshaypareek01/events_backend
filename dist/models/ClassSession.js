import mongoose from "mongoose";
/** Morning/evening Zoom slots; links only via authenticated APIs (Phase 08). */
const classSessionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    /** Human-readable time in program TZ, e.g. "07:00 AM" */
    timeLabel: { type: String, required: true, trim: true },
    zoomLink: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ["morning", "evening"],
        required: true,
    },
    active: { type: Boolean, default: true },
}, { timestamps: true });
classSessionSchema.index({ type: 1, active: 1 });
export const ClassSession = mongoose.models.ClassSession ??
    mongoose.model("ClassSession", classSessionSchema);
