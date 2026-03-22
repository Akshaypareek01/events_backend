import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-insecure-change-me";

export type TokenPayload = {
  sub: string;
  typ: "user" | "admin";
};

/** Short-lived token for /pay before user has a login JWT (issued at registration). */
export type PayTokenPayload = {
  sub: string;
  typ: "pay";
};

export function signUserToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "user" }, JWT_SECRET, {
    expiresIn: 7 * 24 * 60 * 60,
  });
}

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, typ: "admin" }, JWT_SECRET, {
    expiresIn: 2 * 24 * 60 * 60,
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & TokenPayload;
  if (!decoded.sub || !decoded.typ) {
    throw new Error("Invalid token payload");
  }
  return { sub: decoded.sub, typ: decoded.typ };
}

/** 7-day token for payment page (must match userId in create-order when no user JWT). */
export function signPayToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "pay" } as PayTokenPayload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyPayToken(token: string): PayTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & PayTokenPayload;
    if (decoded.typ !== "pay" || !decoded.sub) return null;
    return { sub: decoded.sub, typ: "pay" };
  } catch {
    return null;
  }
}

/** Optional user JWT from Authorization header (no throw). */
export function tryGetUserIdFromUserBearer(
  authHeader: string | undefined,
): string | null {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.typ === "user" ? p.sub : null;
  } catch {
    return null;
  }
}
