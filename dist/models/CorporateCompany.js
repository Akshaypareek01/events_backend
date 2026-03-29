import mongoose from "mongoose";
import { normalizeCouponCode } from "../services/corporateCompanyNormalize.js";
const corporateCompanySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    /** Unique per company; stored uppercase. */
    couponCode: { type: String, required: true, trim: true, uppercase: true },
}, { timestamps: true });
corporateCompanySchema.index({ couponCode: 1 }, { unique: true });
corporateCompanySchema.pre("save", function normalizeCoupon(next) {
    if (this.isModified("couponCode") && typeof this.couponCode === "string") {
        this.couponCode = normalizeCouponCode(this.couponCode);
    }
    next();
});
export const CorporateCompany = mongoose.models.CorporateCompany ??
    mongoose.model("CorporateCompany", corporateCompanySchema);
