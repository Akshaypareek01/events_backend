import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getProgramMeta } from "../../services/programConfig.js";
export const programRouter = Router();
programRouter.get("/program", asyncHandler(async (_req, res) => {
    const meta = await getProgramMeta();
    res.json(meta);
}));
