import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authAdmin } from "../../middleware/authAdmin.js";
import { CorporateCompany } from "../../models/CorporateCompany.js";
import { User } from "../../models/User.js";
import { normalizeCouponCode } from "../../services/corporateCompanyNormalize.js";
const router = Router();
router.use(authAdmin);
function mapCompany(doc) {
    return {
        id: String(doc._id),
        name: doc.name,
        couponCode: doc.couponCode,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
const createBodySchema = z.object({
    name: z.string().trim().min(2, "Company name is required"),
    couponCode: z.string().trim().min(2, "Coupon code is required"),
});
const patchBodySchema = z
    .object({
    name: z.string().trim().min(2).optional(),
    couponCode: z.string().trim().min(2).optional(),
})
    .refine((d) => d.name !== undefined || d.couponCode !== undefined, {
    message: "Provide at least one field to update",
});
router.get("/corporate-companies", asyncHandler(async (_req, res) => {
    const list = await CorporateCompany.find().sort({ name: 1 });
    res.json({ companies: list.map((c) => mapCompany(c)) });
}));
router.post("/corporate-companies", asyncHandler(async (req, res) => {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ApiError(400, "Validation failed", {
            code: "VALIDATION",
            details: parsed.error.flatten(),
        });
    }
    const couponCode = normalizeCouponCode(parsed.data.couponCode);
    try {
        const doc = await CorporateCompany.create({
            name: parsed.data.name.trim(),
            couponCode,
        });
        res.status(201).json({ ok: true, company: mapCompany(doc) });
    }
    catch (e) {
        if (e &&
            typeof e === "object" &&
            "code" in e &&
            e.code === 11000) {
            throw new ApiError(409, "Coupon code already in use for another company", {
                code: "DUPLICATE_COUPON",
            });
        }
        throw e;
    }
}));
router.patch("/corporate-companies/:id", asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid company id", { code: "VALIDATION" });
    }
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ApiError(400, "Validation failed", {
            code: "VALIDATION",
            details: parsed.error.flatten(),
        });
    }
    const doc = await CorporateCompany.findById(id);
    if (!doc) {
        throw new ApiError(404, "Company not found", { code: "NOT_FOUND" });
    }
    const p = parsed.data;
    if (p.name !== undefined)
        doc.name = p.name.trim();
    if (p.couponCode !== undefined)
        doc.couponCode = normalizeCouponCode(p.couponCode);
    try {
        await doc.save();
    }
    catch (e) {
        if (e &&
            typeof e === "object" &&
            "code" in e &&
            e.code === 11000) {
            throw new ApiError(409, "Coupon code already in use", { code: "DUPLICATE_COUPON" });
        }
        throw e;
    }
    res.json({ ok: true, company: mapCompany(doc) });
}));
router.delete("/corporate-companies/:id", asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid company id", { code: "VALIDATION" });
    }
    const linked = await User.countDocuments({ corporateCompanyId: id });
    if (linked > 0) {
        throw new ApiError(409, `Cannot delete: ${linked} user(s) are registered under this company`, { code: "COMPANY_IN_USE" });
    }
    const deleted = await CorporateCompany.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Company not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, id });
}));
export const adminCorporateRouter = router;
