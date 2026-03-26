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

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.subscriber.count({ where }),
    ]);

    res.json({ data: subscribers, total });
  })
);

router.get(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      res.status(404).json({ error: "Subscriber not found" });
      return;
    }

    res.json(subscriber);
  })
);

router.post(
  "/",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const subscriber = await prisma.subscriber.create({
      data: req.body,
    });

    res.status(201).json(subscriber);
  })
);

router.put(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const subscriber = await prisma.subscriber.update({
      where: { id },
      data: req.body,
    });

    res.json(subscriber);
  })
);

router.delete(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    await prisma.subscriber.delete({
      where: { id },
    });

    res.json({ success: true });
  })
);

export default router;
