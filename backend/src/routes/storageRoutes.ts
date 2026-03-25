import { Router } from "express";
import * as storageController from "../controllers/storageController.js";
import { authenticate, requireRoles, authenticateCron } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  testConnectionSchema,
  createFoldersSchema,
  syncDocumentsSchema,
  updateStorageConfigSchema,
  resolveDocumentSchema,
  paginationSchema,
} from "../lib/schemas.js";

const router = Router();

const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN"];
const VIEWER_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN", "STAFFINGLY_SUPERVISOR"];
const WORKER_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
];

router.post(
  "/test",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  validateBody(testConnectionSchema),
  asyncHandler(storageController.testConnection)
);

router.post(
  "/folders",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  validateBody(createFoldersSchema),
  asyncHandler(storageController.createFolders)
);

router.post(
  "/sync",
  (req, res, next) => {
    if (req.headers["x-cron-secret"]) {
      return authenticateCron(req, res, next);
    }
    authenticate(req, res, () => {
      requireRoles(...ADMIN_ROLES)(req, res, next);
    });
  },
  validateBody(syncDocumentsSchema),
  asyncHandler(storageController.syncDocuments)
);

router.get(
  "/config/:clientId",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(storageController.getStorageConfig)
);

router.put(
  "/config/:clientId",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  validateBody(updateStorageConfigSchema),
  asyncHandler(storageController.updateStorageConfig)
);

// Generic CRUD endpoints for ClientStorageConfig (for entity service compatibility)
router.get(
  "/configs",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(storageController.listStorageConfigs)
);

router.post(
  "/configs",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(storageController.createStorageConfig)
);

router.put(
  "/configs/:id",
  authenticate,
  requireRoles(...ADMIN_ROLES),
  asyncHandler(storageController.updateStorageConfigById)
);

router.get(
  "/logs",
  authenticate,
  requireRoles(...VIEWER_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(storageController.getSyncLogs)
);

router.get(
  "/unmatched",
  authenticate,
  requireRoles(...WORKER_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(storageController.getUnmatchedDocuments)
);

router.post(
  "/unmatched/:id/resolve",
  authenticate,
  requireRoles(...WORKER_ROLES),
  validateBody(resolveDocumentSchema),
  asyncHandler(storageController.resolveUnmatchedDocument)
);

export default router;
