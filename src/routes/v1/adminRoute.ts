import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AdminUser } from "../../models/AdminUser.js";
import { ClassSession } from "../../models/ClassSession.js";
import { CorporateCompany } from "../../models/CorporateCompany.js";
import { ProgramConfig } from "../../models/ProgramConfig.js";
import { User } from "../../models/User.js";
import { Teacher } from "../../models/Teacher.js";
import { escapeRegex } from "../../lib/escapeRegex.js";
import { normalizeDomainList } from "../../services/corporateAllowlist.js";
import {
  buildAdminPaymentMatch,
  listAdminPayments,
} from "../../services/adminPaymentList.js";
import {
  getReminderPreview,
  sendClassSessionReminders,
  sendPaymentPendingReminders,
} from "../../services/adminReminderSend.js";
import { computeIndividualPayableInr } from "../../services/pricing.js";
import {
  normalizeProgramTitle,
  PUBLIC_PROGRAM_TITLE,
} from "../../services/programConfig.js";
import { authAdmin } from "../../middleware/authAdmin.js";
import { signAdminToken } from "../../services/authJwt.js";
import { canDeliverEmail, sendMailSafe } from "../../services/email.js";
import { teacherCredentialsEmail } from "../../services/emailTemplates.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const reminderSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const adminRouter = Router();

adminRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid credentials", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const admin = await AdminUser.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    if (!admin) {
      throw new ApiError(401, "Invalid email or password", { code: "AUTH" });
    }

    const match = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!match) {
      throw new ApiError(401, "Invalid email or password", { code: "AUTH" });
    }

    const token = signAdminToken(admin._id.toString());
    res.json({ token, adminId: admin._id.toString() });
  }),
);

adminRouter.use(authAdmin);

/** Dashboard aggregates: user counts, domain count, estimated revenue from paid seats. */
adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const program = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    const basePriceInr = program?.priceInr ?? 499;
    const payableInr = computeIndividualPayableInr(basePriceInr);
    const currency = program?.currency ?? "INR";
    const domains = program?.allowedCorporateDomains ?? [];

    const [totalUsers, corporateUsers, individualUsers, paidRegistrations, corporateCompaniesCount] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ userType: "corporate" }),
        User.countDocuments({ userType: "normal" }),
        User.countDocuments({ paymentStatus: "paid" }),
        CorporateCompany.countDocuments(),
      ]);

    const totalRevenueInr = paidRegistrations * payableInr;

    res.json({
      totalUsers,
      corporateUsers,
      individualUsers,
      corporateDomainsCount: domains.length,
      corporateCompaniesCount,
      paidRegistrations,
      totalRevenueInr,
      programPriceInr: payableInr,
      currency,
    });
  }),
);

const patchProgramSchema = z.object({
  allowedCorporateDomains: z.array(z.string()).optional(),
  title: z.string().min(1).optional(),
  priceInr: z.number().min(0).optional(),
  durationMonths: z.number().min(1).optional(),
  currency: z.string().min(1).optional(),
});

adminRouter.get(
  "/program",
  asyncHandler(async (_req, res) => {
    const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    if (!doc) {
      res.json({
        title: PUBLIC_PROGRAM_TITLE,
        durationMonths: 3,
        priceInr: 499,
        currency: "INR",
        allowedCorporateDomains: [],
      });
      return;
    }
    res.json({
      title: normalizeProgramTitle(doc.title),
      durationMonths: doc.durationMonths,
      priceInr: doc.priceInr,
      currency: doc.currency,
      allowedCorporateDomains: doc.allowedCorporateDomains ?? [],
    });
  }),
);

adminRouter.patch(
  "/program",
  asyncHandler(async (req, res) => {
    const parsed = patchProgramSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    if (!doc) {
      throw new ApiError(404, "Program not found", { code: "NOT_FOUND" });
    }
    const p = parsed.data;
    if (p.title !== undefined) doc.title = p.title;
    if (p.durationMonths !== undefined) doc.durationMonths = p.durationMonths;
    if (p.priceInr !== undefined) doc.priceInr = p.priceInr;
    if (p.currency !== undefined) doc.currency = p.currency;
    if (p.allowedCorporateDomains !== undefined) {
      doc.allowedCorporateDomains = normalizeDomainList(p.allowedCorporateDomains);
    }
    await doc.save();
    res.json({
      ok: true,
      program: {
        title: normalizeProgramTitle(doc.title),
        durationMonths: doc.durationMonths,
        priceInr: doc.priceInr,
        currency: doc.currency,
        allowedCorporateDomains: doc.allowedCorporateDomains ?? [],
      },
    });
  }),
);

const usersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional().default(""),
  userType: z.enum(["all", "normal", "corporate"]).default("all"),
  /** Filter by payment: all | paid | pending | free (corporate waiver). */
  paymentStatus: z.enum(["all", "paid", "pending", "free"]).default("all"),
});

const paymentsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["all", "paid", "pending", "free"]).default("all"),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
  })
  .refine((q) => (q.from && q.to) || (!q.from && !q.to), {
    message: "Provide both from and to, or neither",
  });

function parseUtcDayBounds(from: string, to: string): { from: Date; to: Date } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (
    [fy, fm, fd, ty, tm, td].some((n) => Number.isNaN(n)) ||
    from.length < 10 ||
    to.length < 10
  ) {
    throw new ApiError(400, "Invalid date (use YYYY-MM-DD)", { code: "VALIDATION" });
  }
  const start = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0));
  const end = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999));
  if (start > end) {
    throw new ApiError(400, "from must be before or equal to to", { code: "VALIDATION" });
  }
  return { from: start, to: end };
}

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const parsed = usersListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid query", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const { page, limit, q, userType, paymentStatus } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (userType === "normal" || userType === "corporate") {
      filter.userType = userType;
    }
    if (paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }
    if (q.length > 0) {
      const esc = escapeRegex(q);
      filter.$or = [
        { name: { $regex: esc, $options: "i" } },
        { email: { $regex: esc, $options: "i" } },
        { phone: { $regex: esc, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      User.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      users: rows.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        city: u.city,
        country: u.country,
        companyName: u.companyName,
        companyDomain: u.companyDomain,
        corporateCompanyId: u.corporateCompanyId ? String(u.corporateCompanyId) : undefined,
        userType: u.userType,
        paymentStatus: u.paymentStatus,
        isApproved: u.isApproved,
        razorpayOrderId: u.razorpayOrderId,
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
    });
  }),
);

adminRouter.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const parsed = paymentsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid query", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const { page, limit, status } = parsed.data;
    const program = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    const basePriceInr = program?.priceInr ?? 499;
    const payableInr = computeIndividualPayableInr(basePriceInr);
    const currency = program?.currency ?? "INR";

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (parsed.data.from && parsed.data.to) {
      const bounds = parseUtcDayBounds(parsed.data.from, parsed.data.to);
      fromDate = bounds.from;
      toDate = bounds.to;
    }

    const match = buildAdminPaymentMatch({
      status,
      from: fromDate,
      to: toDate,
    });

    const { rows, total } = await listAdminPayments({
      page,
      limit,
      match,
      payableInr,
      currency,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      transactions: rows,
      total,
      page,
      limit,
      totalPages,
      programPriceInr: payableInr,
      currency,
    });
  }),
);

const patchUserSchema = z.object({
  isApproved: z.boolean().optional(),
  paymentStatus: z.enum(["pending", "paid", "free"]).optional(),
});

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const existing = await User.findById(req.params.id);
    if (!existing) {
      throw new ApiError(404, "User not found", { code: "NOT_FOUND" });
    }
    const p = parsed.data;
    if (p.isApproved !== undefined) existing.isApproved = p.isApproved;
    if (p.paymentStatus !== undefined) {
      if (p.paymentStatus === "paid" && existing.paymentStatus !== "paid") {
        existing.paidAt = new Date();
      }
      existing.paymentStatus = p.paymentStatus;
    }
    await existing.save();
    res.json({ ok: true, user: { id: String(existing._id), ...p } });
  }),
);

const bulkDeleteUsersSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

adminRouter.post(
  "/users/bulk-delete",
  asyncHandler(async (req, res) => {
    const parsed = bulkDeleteUsersSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const validIds = parsed.data.ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new ApiError(400, "No valid user ids", { code: "VALIDATION" });
    }
    const oids = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const result = await User.deleteMany({ _id: { $in: oids } });
    res.json({ ok: true, deletedCount: result.deletedCount });
  }),
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid user id", { code: "VALIDATION" });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      throw new ApiError(404, "User not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, id });
  }),
);

const teacherUsernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscores only");

const createTeacherBodySchema = z.object({
  username: teacherUsernameSchema,
  password: z.string().min(6),
  displayName: z.string().min(1).max(80).optional(),
  /** If set, username + password are emailed to this address (when mail is configured). */
  email: z.string().email().optional(),
});

const patchTeacherBodySchema = z.object({
  password: z.string().min(6).optional(),
  displayName: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
});

adminRouter.get(
  "/teachers",
  asyncHandler(async (_req, res) => {
    const list = await Teacher.find().sort({ username: 1 });
    res.json({
      teachers: list.map((t) => ({
        id: String(t._id),
        username: t.username,
        displayName: t.displayName || t.username,
        email: t.email ?? null,
        active: t.active,
        createdAt: t.createdAt,
      })),
    });
  }),
);

adminRouter.post(
  "/teachers",
  asyncHandler(async (req, res) => {
    const parsed = createTeacherBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const username = parsed.data.username.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const displayName = (parsed.data.displayName?.trim() ?? "") || username;
    const emailLower = parsed.data.email?.trim().toLowerCase();
    try {
      const doc = await Teacher.create({
        username,
        passwordHash,
        displayName,
        active: true,
        ...(emailLower ? { email: emailLower } : {}),
      });

      let emailSent = false;
      let emailNote: string | undefined;
      if (emailLower) {
        if (!canDeliverEmail()) {
          emailNote =
            "Teacher created. Email was not sent — configure SES or SMTP plus From (EMAIL_FROM / SMTP_FROM). Set WEB_ORIGIN for the correct login link in the message. Share credentials manually.";
        } else {
          const webOrigin = (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
          const teacherLoginUrl = `${webOrigin}/teacher/login`;
          const mail = teacherCredentialsEmail({
            displayName,
            teacherLoginUrl,
            username: doc.username,
            password: parsed.data.password,
          });
          try {
            await sendMailSafe({
              to: emailLower,
              subject: mail.subject,
              text: mail.text,
              html: mail.html,
            });
            emailSent = true;
          } catch (sendErr) {
            console.error("[admin] teacher credentials email failed", sendErr);
            emailNote =
              "Teacher saved, but sending the email failed. Check server logs and resend credentials manually.";
          }
        }
      }

      res.status(201).json({
        ok: true,
        teacher: {
          id: String(doc._id),
          username: doc.username,
          displayName: doc.displayName,
          email: doc.email ?? null,
        },
        emailSent,
        ...(emailNote ? { emailNote } : {}),
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: number }).code === 11000
      ) {
        throw new ApiError(409, "Username or email already in use", { code: "DUPLICATE" });
      }
      throw e;
    }
  }),
);

adminRouter.patch(
  "/teachers/:id",
  asyncHandler(async (req, res) => {
    const parsed = patchTeacherBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid id", { code: "VALIDATION" });
    }
    const t = await Teacher.findById(id);
    if (!t) {
      throw new ApiError(404, "Teacher not found", { code: "NOT_FOUND" });
    }
    const p = parsed.data;
    if (p.password !== undefined) {
      t.passwordHash = await bcrypt.hash(p.password, 10);
    }
    if (p.displayName !== undefined) t.displayName = p.displayName.trim();
    if (p.active !== undefined) t.active = p.active;
    if (p.email !== undefined) {
      t.email = p.email === "" ? undefined : p.email.toLowerCase().trim();
    }
    await t.save();
    res.json({
      ok: true,
      teacher: {
        id: String(t._id),
        username: t.username,
        displayName: t.displayName || t.username,
        email: t.email ?? null,
        active: t.active,
      },
    });
  }),
);

adminRouter.delete(
  "/teachers/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid id", { code: "VALIDATION" });
    }
    const deleted = await Teacher.findByIdAndDelete(id);
    if (!deleted) {
      throw new ApiError(404, "Teacher not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, id });
  }),
);

adminRouter.get(
  "/classes",
  asyncHandler(async (_req, res) => {
    const list = await ClassSession.find().sort({ type: 1 });
    res.json({
      classes: list.map((c) => ({
        id: String(c._id),
        title: c.title,
        timeLabel: c.timeLabel,
        zoomLink: c.zoomLink,
        type: c.type,
        active: c.active,
      })),
    });
  }),
);

const patchClassSchema = z.object({
  zoomLink: z.string().min(4).optional(),
  timeLabel: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

adminRouter.patch(
  "/classes/:id",
  asyncHandler(async (req, res) => {
    const parsed = patchClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const doc = await ClassSession.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
    });
    if (!doc) {
      throw new ApiError(404, "Class not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, class: { id: String(doc._id), ...parsed.data } });
  }),
);

adminRouter.get(
  "/reminders/preview",
  asyncHandler(async (_req, res) => {
    const preview = await getReminderPreview();
    res.json(preview);
  }),
);

adminRouter.post(
  "/reminders/payment-pending",
  reminderSendLimiter,
  asyncHandler(async (_req, res) => {
    const result = await sendPaymentPendingReminders();
    res.json({ ok: true, ...result });
  }),
);

adminRouter.post(
  "/reminders/class-sessions",
  reminderSendLimiter,
  asyncHandler(async (_req, res) => {
    const result = await sendClassSessionReminders();
    res.json({ ok: true, ...result });
  }),
);
