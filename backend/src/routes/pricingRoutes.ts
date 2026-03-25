import { Router } from "express";
import * as pricingController from "../controllers/pricingController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  createPricingPackageSchema,
  updatePricingPackageSchema,
  paginationSchema,
} from "../lib/schemas.js";

const router = Router();

const FINANCE_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN"];
const VIEW_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "STAFFINGLY_ADMIN"];

router.use(authenticate);

router.get(
  "/packages",
  requireRoles(...VIEW_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(pricingController.getPackages)
);

router.get(
  "/packages/:id",
  requireRoles(...VIEW_ROLES),
  asyncHandler(pricingController.getPackageById)
);

router.post(
  "/packages",
  requireRoles(...FINANCE_ROLES),
  validateBody(createPricingPackageSchema),
  asyncHandler(pricingController.createPackage)
);

router.put(
  "/packages/:id",
  requireRoles(...FINANCE_ROLES),
  validateBody(updatePricingPackageSchema),
  asyncHandler(pricingController.updatePackage)
);

router.delete(
  "/packages/:id",
  requireRoles(...FINANCE_ROLES),
  asyncHandler(pricingController.deletePackage)
);

export default router;
