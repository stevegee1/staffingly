import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/uploadController.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.use(authenticate);

router.post("/file", upload.single("file"), asyncHandler(uploadController.uploadFile));

router.post("/extract-data", asyncHandler(uploadController.extractDataFromFile));

export default router;
