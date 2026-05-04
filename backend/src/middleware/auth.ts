import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { getIpRestrictionError } from "../lib/ipSecurity.js";
import type { AuthenticatedRequest, JwtPayload } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  FINANCE_ADMIN: 80,
  STAFFINGLY_ADMIN: 70,
  STAFFINGLY_SUPERVISOR: 60,
  STAFFINGLY_SPECIALIST: 50,
  CLIENT_USER: 10,
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { client: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (!decoded.sessionId) {
      res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
      return;
    }

    if (user.active === false) {
      res.status(403).json({ error: "Your account has been deactivated. Contact an administrator." });
      return;
    }

    if (user.accountLocked) {
      res.status(403).json({ error: "Your account has been locked. Contact an administrator." });
      return;
    }

    const ipRestrictionError = getIpRestrictionError(req, user.allowedIpAddresses);
    if (ipRestrictionError) {
      res.status(403).json({ error: ipRestrictionError });
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session || session.userId !== user.id || session.revokedAt) {
      res.status(401).json({ error: "Your session has been revoked. Please sign in again." });
      return;
    }

    if (session.expiresAt && session.expiresAt <= new Date()) {
      res.status(401).json({ error: "Your session has expired. Please sign in again." });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
};

export const requireMinRole = (minRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
};

export const authenticateInternal = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.INTERNAL_API_TOKEN;

  if (!expectedToken) {
    res.status(500).json({ error: "Internal API token not configured" });
    return;
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};

export const authenticateCron = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const rawCronSecret = req.headers["x-cron-secret"];
  const cronSecret = Array.isArray(rawCronSecret) ? rawCronSecret[0] : rawCronSecret;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    res.status(500).json({ error: "Cron secret not configured" });
    return;
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = {
    userId: "system",
    email: "system@staffverify.com",
    role: "SUPER_ADMIN",
    clientId: null,
    sessionId: null,
  };
  next();
};
