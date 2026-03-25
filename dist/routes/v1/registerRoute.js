import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { User } from "../../models/User.js";
import { normalizePhone } from "../../services/phone.js";
import { sendMailSafe } from "../../services/email.js";
import { corporateRegisteredEmail, registrationEmail, } from "../../services/emailTemplates.js";
import { extractEmailDomain } from "../../lib/companyEmail.js";
import { isCorporateEmailAllowed } from "../../services/corporateAllowlist.js";
import { getProgramMeta } from "../../services/programConfig.js";
import { signPayToken } from "../../services/authJwt.js";
import { registerBodySchema } from "../../validation/registerSchema.js";
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
});
export const registerRouter = Router();
registerRouter.post("/register", registerLimiter, asyncHandler(async (req, res) => {
    const parsed = registerBodySchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ApiError(400, "Validation failed", {
            code: "VALIDATION",
            details: parsed.error.flatten(),
        });
    }
    const body = parsed.data;
    const phone = normalizePhone(body.phone);
    if (phone.length !== 10) {
        throw new ApiError(400, "Enter a valid 10-digit mobile number", {
            code: "INVALID_PHONE",
        });
    }
    const isCorporate = body.userType === "corporate";
    const emailLower = body.email.toLowerCase();
    const domainFromEmail = extractEmailDomain(emailLower);
    if (isCorporate) {
        if (!domainFromEmail) {
            throw new ApiError(400, "Invalid email address", { code: "INVALID_EMAIL" });
        }
        const allowed = await isCorporateEmailAllowed(emailLower);
        if (!allowed) {
            throw new ApiError(403, "This work email domain is not authorized for complimentary corporate access. Please register as an individual to pay and join, or ask your organizer to add your company domain in admin settings.", { code: "CORPORATE_NOT_AUTHORIZED" });
        }
    }
    const doc = await User.create({
        name: body.name,
        email: emailLower,
        phone,
        city: body.city.trim(),
        country: body.country.trim(),
        userType: body.userType,
        gender: body.gender,
        companyName: isCorporate ? body.companyName?.trim() : undefined,
        companyDomain: isCorporate ? domainFromEmail : undefined,
        paymentStatus: isCorporate ? "free" : "pending",
        isApproved: isCorporate,
    });
    const meta = await getProgramMeta();
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    let payTokenForClient;
    if (isCorporate) {
        const mail = corporateRegisteredEmail({
            name: doc.name,
            dashboardUrl: `${webOrigin}/dashboard`,
            programTitle: meta.title,
        });
        await sendMailSafe({ to: doc.email, ...mail });
    }
    else {
        payTokenForClient = signPayToken(doc._id.toString());
        const payUrl = `${webOrigin}/pay?userId=${doc._id.toString()}&token=${encodeURIComponent(payTokenForClient)}`;
        const mail = registrationEmail({
            name: doc.name,
            payUrl,
            programTitle: meta.title,
        });
        await sendMailSafe({ to: doc.email, ...mail });
    }
    const userId = doc._id.toString();
    res.status(201).json({
        userId,
        paymentStatus: doc.paymentStatus,
        isApproved: doc.isApproved,
        ...(payTokenForClient ? { payToken: payTokenForClient } : {}),
    });
}));
