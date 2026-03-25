import { Router, Response } from "express";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type { AuthenticatedRequest } from "../types/index.js";
import * as aiService from "../services/aiService.js";

const router = Router();

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
];

router.use(authenticate);

/**
 * POST /api/ai/invoke
 * General LLM invocation endpoint (for legacy frontend compatibility)
 */
router.post(
  "/invoke",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt, context, response_json_schema, file_urls } = req.body;

    // If file_urls provided, attempt document classification
    if (file_urls && file_urls.length > 0) {
      const results = [];
      for (const fileUrl of file_urls) {
        const result = await aiService.classifyDocument({ fileUrl });
        results.push(result);
      }

      // If single file, return result directly
      if (results.length === 1) {
        res.json(results[0]);
        return;
      }

      res.json({ results });
      return;
    }

    // For non-file prompts, return a placeholder
    // In production, you would call the LLM directly here
    const mockResponse = {
      success: true,
      data: {
        message:
          "General LLM prompts should use file_urls for document classification, or implement custom logic.",
        prompt_received: prompt?.substring(0, 100),
        context_length: context?.length || 0,
      },
    };

    if (response_json_schema) {
      const mockStructuredData: Record<string, unknown> = {};
      if (response_json_schema.properties) {
        for (const [key, prop] of Object.entries(response_json_schema.properties) as [
          string,
          { type: string },
        ][]) {
          if (prop.type === "string") mockStructuredData[key] = "";
          else if (prop.type === "number") mockStructuredData[key] = 0;
          else if (prop.type === "array") mockStructuredData[key] = [];
          else if (prop.type === "boolean") mockStructuredData[key] = false;
          else if (prop.type === "object") mockStructuredData[key] = {};
        }
      }
      res.json(mockStructuredData);
      return;
    }

    res.json(mockResponse);
  })
);

/**
 * POST /api/ai/classify-document
 * Dedicated document classification endpoint
 */
router.post(
  "/classify-document",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileUrl, fileName } = req.body;

    if (!fileUrl) {
      res.status(400).json({ error: "fileUrl is required" });
      return;
    }

    const result = await aiService.classifyDocument({ fileUrl, fileName });
    res.json(result);
  })
);

/**
 * POST /api/ai/match-document
 * Match document data to open cases
 */
router.post(
  "/match-document",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId, patientInitials, patientDob, insuranceId } = req.body;

    if (!clientId) {
      res.status(400).json({ error: "clientId is required" });
      return;
    }

    // Dynamically import prisma to avoid circular dependency
    const prisma = (await import("../lib/prisma.js")).default;

    const openCases = await prisma.priorAuthCase.findMany({
      where: {
        clientId,
        status: {
          notIn: ["CLOSED", "APPROVED", "DENIED"],
        },
      },
      select: {
        id: true,
        caseNumber: true,
        patientInitials: true,
        patientDob: true,
        insuranceId: true,
        status: true,
        patientName: true,
      },
    });

    const matchResult = aiService.matchDocumentToCase({
      clientId,
      patientInitials,
      patientDob,
      insuranceId,
      openCases,
    });

    if (!matchResult) {
      res.json({ matched: false, message: "No matching case found" });
      return;
    }

    const matchedCase = openCases.find((c) => c.id === matchResult.caseId);

    res.json({
      matched: matchResult.score >= 80,
      confidence: matchResult.score,
      matchedFields: matchResult.matchedFields,
      case: matchedCase
        ? {
            id: matchedCase.id,
            caseNumber: matchedCase.caseNumber,
            patientName: matchedCase.patientName,
            status: matchedCase.status,
          }
        : null,
    });
  })
);

export default router;
