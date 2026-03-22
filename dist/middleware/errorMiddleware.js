import { ApiError } from "../lib/ApiError.js";
/** Central JSON error handler: `{ message, code?, details? }`. */
export function errorMiddleware(err, _req, res, _next) {
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            message: err.message,
            ...(err.code && { code: err.code }),
            ...(err.details !== undefined && { details: err.details }),
        });
    }
    if (isMongoDuplicate(err)) {
        return res.status(409).json({
            message: "Email or phone is already registered",
            code: "DUPLICATE",
        });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
}
function isMongoDuplicate(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000);
}
