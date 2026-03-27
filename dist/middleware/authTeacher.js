import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken } from "../services/authJwt.js";
/** Requires `Authorization: Bearer <teacher JWT>`. Sets `req.teacherId`. */
export const authTeacher = asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        throw new ApiError(401, "Unauthorized", { code: "NO_TOKEN" });
    }
    let payload;
    try {
        payload = verifyToken(token);
    }
    catch {
        throw new ApiError(401, "Invalid or expired token", { code: "BAD_TOKEN" });
    }
    if (payload.typ !== "teacher") {
        throw new ApiError(403, "Invalid token type", { code: "FORBIDDEN" });
    }
    req.teacherId = payload.sub;
    next();
});
