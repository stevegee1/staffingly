import { Router } from "express";
import createCrudRouter from "../lib/createCrudRouter.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN", "STAFFINGLY_SUPERVISOR"];

// Daily Activity Logs CRUD
router.use(
  "/daily-logs",
  createCrudRouter("dailyActivityLog" as any, {
    roles: ADMIN_ROLES,
  })
);

// Audit Logs CRUD
router.use(
  "/audit-logs",
  createCrudRouter("staffinglyAuditLog" as any, {
    roles: ADMIN_ROLES,
  })
);

export default router;
