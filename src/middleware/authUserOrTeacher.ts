import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import type { TokenPayload } from "../services/authJwt.js";
import { verifyToken } from "../services/authJwt.js";

/**
 * Accepts participant (`user`) or `teacher` JWT. Sets `req.userId` and/or `req.teacherId`
 * (exactly one of them).
 */
export const authUserOrTeacher = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    throw new ApiError(401, "Unauthorized", { code: "NO_TOKEN" });
  }
  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token", { code: "BAD_TOKEN" });
  }
  if (payload.typ === "user") {
    req.userId = payload.sub;
  } else if (payload.typ === "teacher") {
    req.teacherId = payload.sub;
  } else {
    throw new ApiError(403, "Invalid token type", { code: "FORBIDDEN" });
  }
  next();
});
