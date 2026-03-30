import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { CorporateCompany } from "../../models/CorporateCompany.js";
import { User } from "../../models/User.js";
import { normalizePhone } from "../../services/phone.js";
import { sendMailSafe } from "../../services/email.js";
import {
  corporateRegisteredEmail,
  registrationEmail,
} from "../../services/emailTemplates.js";
import { extractEmailDomain } from "../../lib/companyEmail.js";
import { getProgramMeta } from "../../services/programConfig.js";
import { signPayToken } from "../../services/authJwt.js";
import { normalizeCouponCode } from "../../services/corporateCompanyNormalize.js";
import { escapeRegex } from "../../lib/escapeRegex.js";
import { registerBodySchema } from "../../validation/registerSchema.js";

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerRouter = Router();

/**
 * Public company search for corporate signup (name + id only).
 * Query `q` filters by substring (case-insensitive); results capped by `limit` (default 50, max 80).
 * `include` = ObjectId ensures that row is present even if outside the first page (selected company).
 */
registerRouter.get(
  "/register/corporate-companies",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const rawLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 80) : 50;
    const q = String(req.query.q ?? "").trim();
    const include = String(req.query.include ?? "").trim();

    const filter: Record<string, unknown> = {};
    if (q.length > 0) {
      filter.name = { $regex: escapeRegex(q), $options: "i" };
    }

    let includeLean: { _id: unknown; name: string } | null = null;
    if (mongoose.Types.ObjectId.isValid(include)) {
      const doc = await CorporateCompany.findById(include).select("name").lean();
      const row = doc as unknown as { _id: unknown; name?: string } | null;
      if (row?.name != null) {
        includeLean = { _id: row._id, name: String(row.name) };
      }
    }

    const docs = await CorporateCompany.find(filter)
      .sort({ name: 1 })
      .limit(limit + 1)
      .select("name")
      .lean();

    const hasMore = docs.length > limit;
    const slice = hasMore ? docs.slice(0, limit) : docs;

    const companies = slice.map((c) => ({
      id: String(c._id),
      name: c.name,
    }));

    if (includeLean) {
      const id = String(includeLean._id);
      if (!companies.some((c) => c.id === id)) {
        companies.unshift({ id, name: includeLean.name });
      }
    }

    res.json({ companies, hasMore });
  }),
);

registerRouter.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
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

    let corporateCompanyId: mongoose.Types.ObjectId | undefined;
    let companyNameForUser: string | undefined;

    if (body.userType === "corporate") {
      const cid = body.corporateCompanyId;
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new ApiError(400, "Invalid company selection", {
          code: "CORPORATE_INVALID_COMPANY",
        });
      }
      const company = await CorporateCompany.findById(cid);
      if (!company) {
        throw new ApiError(403, "Selected company is not available for registration.", {
          code: "CORPORATE_INVALID_COMPANY",
        });
      }
      const couponNorm = normalizeCouponCode(body.corporateCouponCode);
      if (couponNorm !== company.couponCode) {
        throw new ApiError(403, "Coupon code does not match the selected company.", {
          code: "CORPORATE_INVALID_COUPON",
        });
      }
      corporateCompanyId = company._id as mongoose.Types.ObjectId;
      companyNameForUser = company.name;
    }

    const employeeIdStored =
      body.userType === "corporate" && body.employeeId?.trim()
        ? body.employeeId.trim()
        : undefined;

    const doc = await User.create({
      name: body.name,
      email: emailLower,
      phone,
      city: body.city.trim(),
      country: body.country.trim(),
      userType: body.userType,
      companyName: companyNameForUser,
      corporateCompanyId,
      employeeId: employeeIdStored,
      companyDomain: domainFromEmail ?? undefined,
      paymentStatus: isCorporate ? "free" : "pending",
      isApproved: isCorporate,
    });

    const meta = await getProgramMeta();
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    let payTokenForClient: string | undefined;
    if (isCorporate) {
      const mail = corporateRegisteredEmail({
        name: doc.name,
        signInUrl: `${webOrigin}/login`,
        programTitle: meta.title,
      });
      await sendMailSafe({ to: doc.email, ...mail });
    } else {
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
  }),
);
