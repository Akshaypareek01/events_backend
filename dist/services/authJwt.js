import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-insecure-change-me";
export function signUserToken(userId) {
    return jwt.sign({ sub: userId, typ: "user" }, JWT_SECRET, {
        expiresIn: 7 * 24 * 60 * 60,
    });
}
export function signAdminToken(adminId) {
    return jwt.sign({ sub: adminId, typ: "admin" }, JWT_SECRET, {
        expiresIn: 2 * 24 * 60 * 60,
    });
}
export function verifyToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.sub || !decoded.typ) {
        throw new Error("Invalid token payload");
    }
    return { sub: decoded.sub, typ: decoded.typ };
}
/** 7-day token for payment page (must match userId in create-order when no user JWT). */
export function signPayToken(userId) {
    return jwt.sign({ sub: userId, typ: "pay" }, JWT_SECRET, {
        expiresIn: "7d",
    });
}
export function verifyPayToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.typ !== "pay" || !decoded.sub)
            return null;
        return { sub: decoded.sub, typ: "pay" };
    }
    catch {
        return null;
    }
}
/** Optional user JWT from Authorization header (no throw). */
export function tryGetUserIdFromUserBearer(authHeader) {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token)
        return null;
    try {
        const p = verifyToken(token);
        return p.typ === "user" ? p.sub : null;
    }
    catch {
        return null;
    }
}
