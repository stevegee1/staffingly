import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type { AuthenticatedRequest } from "../types/index.js";

const router = Router();

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
  "CLIENT_USER",
];

router.use(authenticate);

router.get(
  "/",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId, limit = "100", offset = "0" } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.provider.count({ where }),
    ]);

    res.json({ data: providers, total });
  })
);

router.get(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
    });

    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    res.json(provider);
  })
);

router.post(
  "/",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const provider = await prisma.provider.create({
      data: req.body,
    });

    res.status(201).json(provider);
  })
);

router.put(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(provider);
  })
);

router.delete(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await prisma.provider.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  })
);

export default router;
