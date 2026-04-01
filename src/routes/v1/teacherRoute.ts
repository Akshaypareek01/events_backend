import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { Teacher } from "../../models/Teacher.js";
import { ClassSession } from "../../models/ClassSession.js";
import { authTeacher } from "../../middleware/authTeacher.js";
import { signTeacherToken } from "../../services/authJwt.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),
});
const updateMeetingLinkSchema = z.object({
  zoomLink: z.string().trim().url("Enter a valid meeting URL"),
});

export const teacherRouter = Router();

teacherRouter.post(
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

    const username = parsed.data.username.trim().toLowerCase();
    const teacher = await Teacher.findOne({ username });
    if (!teacher || !teacher.active) {
      throw new ApiError(401, "Invalid username or password", { code: "AUTH" });
    }

    const match = await bcrypt.compare(parsed.data.password, teacher.passwordHash);
    if (!match) {
      throw new ApiError(401, "Invalid username or password", { code: "AUTH" });
    }

    const token = signTeacherToken(teacher._id.toString());
    res.json({
      token,
      teacherId: teacher._id.toString(),
      teacher: {
        username: teacher.username,
        displayName: teacher.displayName || teacher.username,
      },
    });
  }),
);

teacherRouter.get(
  "/me",
  authTeacher,
  asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    if (!teacher.active) {
      throw new ApiError(403, "Account disabled", { code: "NO_ACCESS" });
    }
    res.json({
      teacher: {
        id: teacher._id.toString(),
        username: teacher.username,
        displayName: teacher.displayName || teacher.username,
      },
    });
  }),
);

teacherRouter.patch(
  "/classes/:id/meeting-link",
  authTeacher,
  asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher?.active) {
      throw new ApiError(403, "Account disabled", { code: "NO_ACCESS" });
    }

    const classId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new ApiError(400, "Invalid class id", { code: "VALIDATION" });
    }

    const parsed = updateMeetingLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }

    const cls = await ClassSession.findById(classId);
    if (!cls || !cls.active) {
      throw new ApiError(404, "Session not found", { code: "NOT_FOUND" });
    }

    cls.zoomLink = parsed.data.zoomLink;
    await cls.save();

    res.json({
      ok: true,
      class: {
        id: String(cls._id),
        title: cls.title,
        timeLabel: cls.timeLabel,
        type: cls.type,
        zoomLink: cls.zoomLink,
      },
    });
  }),
);
