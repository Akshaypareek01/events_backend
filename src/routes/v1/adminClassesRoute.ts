import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../../lib/ApiError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authAdmin } from "../../middleware/authAdmin.js";
import { ClassSession } from "../../models/ClassSession.js";

const classTypeSchema = z.enum(["morning", "evening"]);

const createClassSchema = z.object({
  title: z.string().min(1),
  timeLabel: z.string().min(1),
  zoomLink: z.string().min(4),
  type: classTypeSchema,
  active: z.boolean().optional().default(true),
});

const patchClassSchema = z.object({
  title: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  zoomLink: z.string().min(4).optional(),
  type: classTypeSchema.optional(),
  active: z.boolean().optional(),
});

function mapClass(doc: {
  _id: unknown;
  title: string;
  timeLabel: string;
  zoomLink: string;
  type: string;
  active: boolean;
}) {
  return {
    id: String(doc._id),
    title: doc.title,
    timeLabel: doc.timeLabel,
    zoomLink: doc.zoomLink,
    type: doc.type,
    active: doc.active,
  };
}

export const adminClassesRouter = Router();
adminClassesRouter.use(authAdmin);

adminClassesRouter.get(
  "/classes",
  asyncHandler(async (_req, res) => {
    const list = await ClassSession.find().sort({ type: 1, createdAt: 1 });
    res.json({ classes: list.map(mapClass) });
  }),
);

adminClassesRouter.post(
  "/classes",
  asyncHandler(async (req, res) => {
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const doc = await ClassSession.create(parsed.data);
    res.status(201).json({ ok: true, class: mapClass(doc) });
  }),
);

adminClassesRouter.patch(
  "/classes/:id",
  asyncHandler(async (req, res) => {
    const parsed = patchClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid body", {
        code: "VALIDATION",
        details: parsed.error.flatten(),
      });
    }
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid class id", { code: "VALIDATION" });
    }
    const doc = await ClassSession.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!doc) {
      throw new ApiError(404, "Class not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, class: mapClass(doc) });
  }),
);

adminClassesRouter.delete(
  "/classes/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid class id", { code: "VALIDATION" });
    }
    const doc = await ClassSession.findByIdAndDelete(id);
    if (!doc) {
      throw new ApiError(404, "Class not found", { code: "NOT_FOUND" });
    }
    res.json({ ok: true, id });
  }),
);
