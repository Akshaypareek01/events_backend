import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { User } from "../../models/User.js";
import { authUser } from "../../middleware/authUser.js";
import { canAccessProgram } from "../../services/access.js";
export const meRouter = Router();
meRouter.get("/me", authUser, asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
        res.status(404).json({ message: "Not found" });
        return;
    }
    res.json({
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            userType: user.userType,
            paymentStatus: user.paymentStatus,
            isApproved: user.isApproved,
            canAccess: canAccessProgram({
                userType: user.userType,
                paymentStatus: user.paymentStatus,
                isApproved: user.isApproved,
            }),
        },
    });
}));
