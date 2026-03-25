import { Router } from "express";
import createCrudRouter from "../lib/createCrudRouter.js";

const router = Router();
const FINANCE_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "STAFFINGLY_ADMIN"];

// Payroll Rates CRUD
router.use(
  "/rates",
  createCrudRouter("payrollRate" as any, {
    roles: FINANCE_ROLES,
  })
);

// Payroll Adjustments CRUD
router.use(
  "/adjustments",
  createCrudRouter("payrollAdjustment" as any, {
    roles: FINANCE_ROLES,
  })
);

export default router;
