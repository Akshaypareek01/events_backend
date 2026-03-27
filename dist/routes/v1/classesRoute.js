import { Router } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { User } from "../../models/User.js";
import { Teacher } from "../../models/Teacher.js";
import { ClassSession } from "../../models/ClassSession.js";
import { authUserOrTeacher } from "../../middleware/authUserOrTeacher.js";
import { canAccessProgram } from "../../services/access.js";
export const classesRouter = Router();
function mapClasses(classes) {
    return classes.map((c) => ({
        id: String(c._id),
        title: c.title,
        timeLabel: c.timeLabel,
        type: c.type,
        zoomLink: c.zoomLink,
    }));
}
classesRouter.get("/classes/today", authUserOrTeacher, asyncHandler(async (req, res) => {
    if (req.teacherId) {
        const teacher = await Teacher.findById(req.teacherId);
        if (!teacher?.active) {
            throw new ApiError(403, "Account disabled", { code: "NO_ACCESS" });
        }
        const classes = await ClassSession.find({ active: true }).sort({ type: 1 });
        res.json({ classes: mapClasses(classes) });
        return;
    }
    const user = await User.findById(req.userId);
    if (!user ||
        !canAccessProgram({
            userType: user.userType,
            paymentStatus: user.paymentStatus,
            isApproved: user.isApproved,
        })) {
        throw new ApiError(403, "Complete payment or wait for approval", {
            code: "NO_ACCESS",
        });
    }
    const classes = await ClassSession.find({ active: true }).sort({ type: 1 });
    res.json({
        classes: mapClasses(classes),
    });
}));
