import { Router, Response } from "express";
import prisma from "./prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type { AuthenticatedRequest } from "../types/index.js";

const DEFAULT_ROLES = [
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
  "CLIENT_USER",
];

export interface CrudOptions {
  roles?: string[];
  filterField?: string | null;
  orderBy?: Record<string, "asc" | "desc">;
  include?: any;
}

export default function createCrudRouter(
  modelName: keyof typeof prisma,
  options: CrudOptions = {}
): Router {
  const router = Router();
  const model = prisma[modelName] as any;

  if (!model) {
    throw new Error(`Model ${String(modelName)} not found in Prisma client`);
  }

  const {
    roles = DEFAULT_ROLES,
    filterField = null,
    orderBy = { createdAt: "desc" },
    include = undefined,
  } = options;

  router.use(authenticate);

  // List/Filter
  router.get(
    "/",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const {
        limit = "100",
        offset = "0",
        sortBy,
        sortOrder = "desc",
        ...filters
      } = req.query as Record<string, string>;

      const where: Record<string, any> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          where[key] = value;
        }
      }

      if (req.user?.role === "CLIENT_USER" && req.user.clientId && filterField) {
        where[filterField] = req.user.clientId;
      }

      const orderByField = sortBy ? { [sortBy]: sortOrder } : orderBy;

      const [items, total] = await Promise.all([
        model.findMany({
          where,
          orderBy: orderByField,
          take: parseInt(limit),
          skip: parseInt(offset),
          include,
        }),
        model.count({ where }),
      ]);

      res.json({ data: items, total });
    })
  );

  // Get by ID
  router.get(
    "/:id",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const item = await model.findUnique({
        where: { id: req.params.id },
        include,
      });

      if (!item) {
        res.status(404).json({ error: `${String(modelName)} not found` });
        return;
      }

      res.json(item);
    })
  );

  // Create
  router.post(
    "/",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const item = await model.create({
        data: req.body,
        include,
      });

      res.status(201).json(item);
    })
  );

  // Update
  router.put(
    "/:id",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const item = await model.update({
        where: { id: req.params.id },
        data: req.body,
        include,
      });

      res.json(item);
    })
  );

  // Partial Update
  router.patch(
    "/:id",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const item = await model.update({
        where: { id: req.params.id },
        data: req.body,
        include,
      });

      res.json(item);
    })
  );

  // Delete
  router.delete(
    "/:id",
    requireRoles(...roles),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      await model.delete({
        where: { id: req.params.id },
      });

      res.json({ success: true });
    })
  );

  return router;
}
