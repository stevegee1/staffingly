import { Router } from "express";
import * as automationController from "../controllers/automationController.js";
import { authenticate, requireRoles, authenticateInternal } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { triggerJobSchema, webhookSchema, paginationSchema } from "../lib/schemas.js";

const router = Router();

const TRIGGER_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
];

const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN", "STAFFINGLY_SUPERVISOR"];

router.post(
  "/trigger",
  authenticate,
  requireRoles(...TRIGGER_ROLES),
  validateBody(triggerJobSchema),
  asyncHandler(automationController.triggerJob)
);

router.post(
  "/webhook",
  authenticateInternal,
  validateBody(webhookSchema),
  asyncHandler(automationController.handleWebhook)
);

router.get(
  "/queue",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(automationController.getQueueStatus)
);

router.get(
  "/jobs",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(automationController.getJobs)
);

router.get(
  "/jobs/:id",
  authenticate,
  requireRoles(...TRIGGER_ROLES),
  asyncHandler(automationController.getJobById)
);

router.post(
  "/jobs/:id/cancel",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(automationController.cancelJob)
);

export default router;
