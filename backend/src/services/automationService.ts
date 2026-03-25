import prisma from "../lib/prisma.js";
import * as emailService from "./emailService.js";

const AUTOMATION_SERVICE_URL = process.env.AUTOMATION_SERVICE_URL;
const AUTOMATION_INTERNAL_TOKEN = process.env.AUTOMATION_INTERNAL_TOKEN;

interface TriggerJobParams {
  jobType: string;
  caseId?: string | null;
  payerName: string;
  urgency?: "URGENT" | "ROUTINE";
  payload?: Record<string, unknown>;
  triggeredBy?: string;
}

interface TriggerJobResult {
  success: boolean;
  jobId: string;
  jobRecordId: string;
  status: string;
  note?: string;
  queuePosition: number;
}

export async function triggerJob({
  jobType,
  caseId,
  payerName,
  urgency = "ROUTINE",
  payload,
  triggeredBy,
}: TriggerJobParams): Promise<TriggerJobResult> {
  if (!jobType || !payerName) {
    throw new Error("jobType and payerName are required");
  }

  const jobId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const activeJobs = await prisma.automationJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
  });

  const queuedUrgent = activeJobs.filter(
    (j: { status: string; urgency: string }) => j.status === "QUEUED" && j.urgency === "URGENT"
  ).length;
  const queuedTotal = activeJobs.filter((j: { status: string }) => j.status === "QUEUED").length;
  const queuePosition = urgency === "URGENT" ? queuedUrgent + 1 : queuedTotal + 1;

  const jobRecord = await prisma.automationJob.create({
    data: {
      jobId,
      jobType,
      caseId: caseId || null,
      payerName,
      urgency,
      status: "QUEUED",
      queuePosition,
      triggeredBy,
    },
  });

  if (queuedTotal > 20 && triggeredBy) {
    await emailService.sendQueueAlertEmail({
      to: triggeredBy,
      jobId,
      jobType,
      payerName,
      queueSize: queuedTotal,
    });
  }

  if (!AUTOMATION_SERVICE_URL) {
    return {
      success: true,
      jobId,
      jobRecordId: jobRecord.id,
      status: "queued",
      note: "AUTOMATION_SERVICE_URL not configured.",
      queuePosition,
    };
  }

  fetch(AUTOMATION_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Job-Id": jobId,
      "X-Job-Record-Id": jobRecord.id,
      Authorization: `Bearer ${AUTOMATION_INTERNAL_TOKEN || ""}`,
    },
    body: JSON.stringify({
      jobId,
      jobRecordId: jobRecord.id,
      jobType,
      caseId,
      payerName,
      urgency,
      payload: payload || {},
    }),
  }).catch(async () => {
    await prisma.automationJob.update({
      where: { id: jobRecord.id },
      data: {
        status: "FAILED",
        errorType: "connection_error",
        errorMessage: "Could not reach automation microservice.",
      },
    });
  });

  return {
    success: true,
    jobId,
    jobRecordId: jobRecord.id,
    status: "queued",
    queuePosition,
  };
}

interface WebhookParams {
  jobRecordId: string;
  jobId?: string;
  status?: string;
  errorType?: string;
  errorMessage?: string;
  resultJson?: Record<string, unknown>;
  confirmationNumber?: string;
  screenshotUrls?: string[];
  startedAt?: string;
  completedAt?: string;
}

export async function handleWebhook({
  jobRecordId,
  jobId,
  status,
  errorType,
  errorMessage,
  resultJson,
  confirmationNumber,
  screenshotUrls,
  startedAt,
  completedAt,
}: WebhookParams): Promise<{ success: boolean }> {
  if (!jobRecordId) {
    throw new Error("jobRecordId required");
  }

  const updateData: Record<string, unknown> = {
    status: status?.toUpperCase() || "COMPLETED",
    startedAt: startedAt ? new Date(startedAt) : undefined,
    completedAt: completedAt ? new Date(completedAt) : new Date(),
  };

  if (errorType) updateData.errorType = errorType;
  if (errorMessage) updateData.errorMessage = errorMessage;
  if (resultJson) updateData.resultJson = JSON.stringify(resultJson);
  if (confirmationNumber) updateData.confirmationNumber = confirmationNumber;
  if (screenshotUrls) updateData.screenshotUrls = screenshotUrls;

  await prisma.automationJob.update({
    where: { id: jobRecordId },
    data: updateData,
  });

  if (status === "failed" && errorType) {
    const job = await prisma.automationJob.findUnique({ where: { id: jobRecordId } });

    const errorLabels: Record<string, string> = {
      credential_error: "Credential Error — rotate credentials in Secret Manager",
      field_mapping_error: "Field Mapping Error — payer portal layout may have changed",
      portal_error: "Unknown Portal Error — check screenshots",
      timeout: "Job Timeout — portal too slow or unreachable",
    };

    if (job) {
      await prisma.notification.create({
        data: {
          type: "automation_failed",
          title: `Automation Job Failed — ${job.payerName}`,
          body: `${errorLabels[errorType] || errorType}. Job ID: ${jobId}. Case: ${job.caseId || "N/A"}.`,
        },
      });
    }
  }

  return { success: true };
}

interface QueueStatusResult {
  queued: number;
  running: number;
  jobs: unknown[];
}

export async function getQueueStatus(): Promise<QueueStatusResult> {
  const jobs = await prisma.automationJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: [{ urgency: "desc" }, { queuedAt: "asc" }],
  });

  return {
    queued: jobs.filter((j: { status: string }) => j.status === "QUEUED").length,
    running: jobs.filter((j: { status: string }) => j.status === "RUNNING").length,
    jobs: jobs.slice(0, 50),
  };
}
