import type { Response } from "express";
import prisma from "../lib/prisma.js";
import * as automationService from "../services/automationService.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const triggerJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobType, caseId, payerName, urgency, payload } = req.body;

  const result = await automationService.triggerJob({
    jobType,
    caseId,
    payerName,
    urgency,
    payload,
    triggeredBy: req.user?.email,
  });

  res.json(result);
};

export const handleWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await automationService.handleWebhook(req.body);
  res.json(result);
};

export const getQueueStatus = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await automationService.getQueueStatus();
  res.json(result);
};

export const getJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, clientId, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status.toUpperCase();
  if (clientId) where.clientId = clientId;

  const [jobs, total] = await Promise.all([
    prisma.automationJob.findMany({
      where,
      orderBy: { queuedAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    }),
    prisma.automationJob.count({ where }),
  ]);

  res.json({ jobs, total });
};

export const getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const job = await prisma.automationJob.findUnique({ where: { id } });

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
};

export const cancelJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const job = await prisma.automationJob.findUnique({ where: { id } });

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status !== "QUEUED") {
    res.status(400).json({ error: "Can only cancel queued jobs" });
    return;
  }

  await prisma.automationJob.update({
    where: { id },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  res.json({ success: true });
};
