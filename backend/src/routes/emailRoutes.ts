import { Router, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type { AuthenticatedRequest } from "../types/index.js";

const router = Router();

router.use(authenticate);

router.post(
  "/send",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { to, subject, body } = req.body;

    if (!to || !subject) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: to, subject",
      });
      return;
    }

    console.log("Email queued:", { to, subject, bodyLength: body?.length });

    res.json({
      success: true,
      message: "Email queued for delivery",
      data: {
        to,
        subject,
        queued_at: new Date().toISOString(),
      },
    });
  })
);

export default router;
