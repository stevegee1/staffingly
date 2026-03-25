import { Router } from "express";
import * as payerRuleController from "../controllers/payerRuleController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createPayerRuleSchema, updatePayerRuleSchema, paginationSchema } from "../lib/schemas.js";

const router = Router();

const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN", "STAFFINGLY_SUPERVISOR"];
const VIEW_ROLES = [...ADMIN_ROLES, "STAFFINGLY_SPECIALIST"];

router.use(authenticate);

router.get(
  "/",
  requireRoles(...VIEW_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(payerRuleController.getPayerRules)
);

router.get("/:id", requireRoles(...VIEW_ROLES), asyncHandler(payerRuleController.getPayerRuleById));

router.post(
  "/",
  requireRoles(...ADMIN_ROLES),
  validateBody(createPayerRuleSchema),
  asyncHandler(payerRuleController.createPayerRule)
);

router.put(
  "/:id",
  requireRoles(...ADMIN_ROLES),
  validateBody(updatePayerRuleSchema),
  asyncHandler(payerRuleController.updatePayerRule)
);

router.delete(
  "/:id",
  requireRoles(...ADMIN_ROLES),
  asyncHandler(payerRuleController.deletePayerRule)
);

export default router;
