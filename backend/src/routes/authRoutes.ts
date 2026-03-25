import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { loginSchema, registerSchema } from "../lib/schemas.js";

const router = Router();

router.post("/register", validateBody(registerSchema), asyncHandler(authController.register));

router.post("/login", validateBody(loginSchema), asyncHandler(authController.login));

router.get("/me", authenticate, asyncHandler(authController.me));

router.post("/logout", authenticate, asyncHandler(authController.logout));

export default router;
