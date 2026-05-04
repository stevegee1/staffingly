import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  revokeUserDeviceSchema,
} from "../lib/schemas.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN"];

router.use(authenticate);

router.get(
  "/",
  requireRoles(...ADMIN_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(userController.getUsers)
);

router.get("/:id", requireRoles(...ADMIN_ROLES), asyncHandler(userController.getUserById));

router.post(
  "/",
  requireRoles(...ADMIN_ROLES),
  validateBody(createUserSchema),
  asyncHandler(userController.createUser)
);

router.put(
  "/:id",
  requireRoles(...ADMIN_ROLES),
  validateBody(updateUserSchema),
  asyncHandler(userController.updateUser)
);

router.post(
  "/:id/revoke-device",
  requireRoles(...ADMIN_ROLES),
  validateBody(revokeUserDeviceSchema),
  asyncHandler(userController.revokeUserDevice)
);

router.delete("/:id", requireRoles("SUPER_ADMIN"), asyncHandler(userController.deleteUser));

export default router;
