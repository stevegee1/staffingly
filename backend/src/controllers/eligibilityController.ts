import type { AutomationJobStatus, CoverageStatus } from "@prisma/client";
import { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/index.js";
import prisma from "../lib/prisma.js";
import {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  sendEligibilityVerification,
} from "../services/masterGatewayService.js";
import { getEhrSystemById, listEhrSystems } from "../services/emrCatalogService.js";

interface CheckEligibilityBody {
  patientName?: string;
  patientFirstName?: string;
  patientLastName?: string;
  dob?: string;
  memberId: string;
  payerId: string;
  payerName?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
  clientId?: string;
  patientId?: string;
  gatewayPatientId?: string;
  submissionType?: "manual" | "ocr" | "emr" | "bulk";
  emrType?: string;
  verificationEngine?: "n8n";
}

interface BulkEligibilityRow {
  patientId?: string;
  patient_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  payer?: string;
  payer_id?: string;
  member_id: string;
  group_number?: string;
  plan_name?: string;
  plan_type?: string;
  effective_date?: string;
  termination_date?: string;
  rx_bin?: string;
  rx_pcn?: string;
  rx_group?: string;
  copay_pcp?: string;
  copay_specialist?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  subscriber_relationship?: string;
  provider_npi?: string;
  cpt_code?: string;
  facility_name?: string;
  notes?: string;
  service_type?: string;
  service_type_code?: string;
  service_date?: string;
}

interface BulkEligibilityBatchBody {
  clientId?: string;
  verificationEngine?: "n8n";
  rows: BulkEligibilityRow[];
}

interface EligibilityResult {
  success: boolean;
  coverageStatus?: string;
  planName?: string;
  planType?: string;
  networkStatus?: string;
  effectiveDate?: string | null;
  terminationDate?: string | null;
  groupNumber?: string | null;
  benefitsRaw?: unknown;
  confidenceScore?: number;
  responseTimeSeconds?: number;
  channelUsed?: string;
  flags?: string[];
  requiresHumanReview?: boolean;
  rawResponse?: unknown;
  error?: string;
  routingTrace?: Array<{
    channel: string;
    status: string;
    detail: string;
  }>;
  automationJobId?: string;
}

interface EligibilityExecutionResult {
  checkRecordId: string;
  gatewayPatientId: string;
  result: EligibilityResult;
}

interface BulkBatchRowResult {
  index: number;
  status: "completed" | "failed";
  input: {
    patientName: string;
    dob: string;
    payerName: string;
    payerId: string;
    memberId: string;
    providerNpi: string;
    serviceDate: string;
    serviceTypeCode: string;
  };
  checkId?: string;
  gatewayPatientId?: string;
  result?: EligibilityResult;
  error?: string;
}

interface BulkBatchJobResult {
  totalRows: number;
  completedRows: number;
  successCount: number;
  failureCount: number;
  verificationEngine: "n8n";
  rows: BulkBatchRowResult[];
}

interface ResolvedClientContext {
  clientId: string;
}

interface GetHistoryQuery {
  clientId?: string;
  subscriberId?: string;
  memberId?: string;
  limit?: string;
  offset?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ListEhrSystemsQuery {
  clientId?: string;
}

interface SearchEmrPatientsQuery {
  clientId?: string;
  search?: string;
  limit?: string;
}

interface ConnectEhrSystemBody {
  clientId?: string;
}

interface EhrConfigBody {
  clientId?: string;
  environmentLabel?: string;
  baseUrl?: string;
  authType?: string;
  clientAppId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string;
  fhirVersion?: string;
}

interface EhrConfigRecord {
  environmentLabel: string;
  baseUrl: string;
  authType: string;
  clientAppId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  fhirVersion: string;
}

interface HistoryWhereClause {
  clientId?: string;
  subscriberId?: string;
  memberId?: string;
}

function toCoverageStatus(value?: string): CoverageStatus | null {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "INACTIVE") return "INACTIVE";
  if (normalized === "UNKNOWN") return "UNKNOWN";

  return null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes("/") ? value.split("/").reverse().join("-") : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRowPatientName(row: BulkEligibilityRow): string {
  if (row.patient_name?.trim()) return row.patient_name.trim();
  return [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ").trim();
}

function normalizeBulkRow(row: BulkEligibilityRow): CheckEligibilityBody {
  return {
    patientName: getRowPatientName(row),
    patientFirstName: row.first_name || "",
    patientLastName: row.last_name || "",
    dob: row.dob || "",
    memberId: row.member_id,
    payerId: row.payer_id || "",
    payerName: row.payer || "",
    providerNpi: row.provider_npi || "",
    serviceTypeCode: row.service_type_code || "30",
    serviceDate: row.service_date || new Date().toISOString().slice(0, 10),
    patientId: row.patientId || undefined,
    submissionType: "bulk",
  };
}

function createEmptyBulkBatchResult(
  totalRows: number,
  verificationEngine: "n8n"
): BulkBatchJobResult {
  return {
    totalRows,
    completedRows: 0,
    successCount: 0,
    failureCount: 0,
    verificationEngine,
    rows: [],
  };
}

function parseJobResult(job: { resultJson: string | null }): BulkBatchJobResult | null {
  if (!job.resultJson) return null;

  try {
    return JSON.parse(job.resultJson) as BulkBatchJobResult;
  } catch {
    return null;
  }
}

function buildRowResult(
  index: number,
  payload: CheckEligibilityBody,
  execution: EligibilityExecutionResult | null,
  error?: string
): BulkBatchRowResult {
  return {
    index,
    status: execution ? "completed" : "failed",
    input: {
      patientName: payload.patientName || "",
      dob: payload.dob || "",
      payerName: payload.payerName || "",
      payerId: payload.payerId || "",
      memberId: payload.memberId,
      providerNpi: payload.providerNpi || "",
      serviceDate: payload.serviceDate || "",
      serviceTypeCode: payload.serviceTypeCode || "30",
    },
    checkId: execution?.checkRecordId,
    gatewayPatientId: execution?.gatewayPatientId,
    result: execution?.result,
    error,
  };
}

async function resolveEligibilityClientContext({
  clientId,
  patientId,
  user,
}: {
  clientId?: string | null;
  patientId?: string | null;
  user?: AuthenticatedUser;
}): Promise<ResolvedClientContext> {
  const requestedClientId = clientId?.trim();
  if (requestedClientId) {
    const client = await prisma.client.findUnique({
      where: { id: requestedClientId },
      select: { id: true },
    });
    if (!client) {
      throw new Error("The selected client could not be found.");
    }
    return { clientId: client.id };
  }

  if (patientId?.trim()) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId.trim() },
      select: { clientId: true },
    });
    if (patient?.clientId) {
      return { clientId: patient.clientId };
    }
  }

  if (user?.clientId?.trim()) {
    const client = await prisma.client.findUnique({
      where: { id: user.clientId.trim() },
      select: { id: true },
    });
    if (client) {
      return { clientId: client.id };
    }
  }

  throw new Error(
    "A valid client context is required for eligibility checks. Please select or sign in under a client account."
  );
}

async function resolveEmrClientId({
  requestedClientId,
  user,
}: {
  requestedClientId?: string | null;
  user?: AuthenticatedUser;
}): Promise<string | null> {
  if (user?.role === "CLIENT_USER") {
    return user.clientId || null;
  }

  if (requestedClientId?.trim()) {
    const client = await prisma.client.findUnique({
      where: { id: requestedClientId.trim() },
      select: { id: true },
    });
    return client?.id || null;
  }

  return user?.clientId || null;
}

function buildEmrPatientProjection(
  subscriber: {
    id: string;
    firstName: string | null;
    lastName: string;
    dob: string | null;
    memberId: string | null;
    payer: string | null;
    payerId: string | null;
    groupNumber: string | null;
    planType: string | null;
    clientId: string;
  },
  emrName: string
) {
  const foundFields = [
    subscriber.firstName || subscriber.lastName ? "Name" : null,
    subscriber.dob ? "DOB" : null,
    subscriber.memberId ? "Member ID" : null,
    subscriber.payer || subscriber.payerId ? "Payer" : null,
    subscriber.groupNumber ? "Group Number" : null,
    subscriber.planType ? "Plan Type" : null,
  ].filter((value): value is string => Boolean(value));

  const missingFields = [
    "CPT Code",
    "Service Date",
    "Provider NPI",
  ];

  return {
    id: subscriber.id,
    clientId: subscriber.clientId,
    source: emrName,
    mrn: subscriber.id,
    name: `${subscriber.firstName || ""} ${subscriber.lastName || ""}`.trim(),
    firstName: subscriber.firstName || "",
    lastName: subscriber.lastName || "",
    dob: subscriber.dob || "",
    payer: subscriber.payer || "",
    payerId: subscriber.payerId || "",
    memberId: subscriber.memberId || "",
    groupNumber: subscriber.groupNumber || "",
    planType: subscriber.planType || "",
    foundFields,
    missingFields,
  };
}

function parseEhrConfig(rawValue?: string | null): EhrConfigRecord | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<EhrConfigRecord>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      environmentLabel: String(parsed.environmentLabel || ""),
      baseUrl: String(parsed.baseUrl || ""),
      authType: String(parsed.authType || "smart_on_fhir"),
      clientAppId: String(parsed.clientAppId || ""),
      clientSecret: String(parsed.clientSecret || ""),
      redirectUri: String(parsed.redirectUri || ""),
      scopes: String(parsed.scopes || ""),
      fhirVersion: String(parsed.fhirVersion || "R4"),
    };
  } catch {
    return null;
  }
}

async function runEligibilityCheck(
  payload: CheckEligibilityBody,
  user?: AuthenticatedUser
): Promise<EligibilityExecutionResult> {
  const {
    patientName,
    patientFirstName,
    patientLastName,
    dob,
    memberId,
    payerId,
    payerName,
    providerNpi,
    serviceTypeCode,
    serviceDate,
    clientId,
    patientId,
    gatewayPatientId,
    submissionType,
    emrType,
    verificationEngine = "n8n",
  } = payload;
  const clientContext = await resolveEligibilityClientContext({
    clientId,
    patientId,
    user,
  });

  const resolvedPatientName =
    patientName ||
    [patientFirstName?.trim(), patientLastName?.trim()].filter(Boolean).join(" ").trim();

  const resolvedGatewayPatientId = buildGatewayPatientId({
    gatewayPatientId,
    patientName: resolvedPatientName,
    dob,
    memberId,
  });

  const result = normalizeEligibilityGatewayResponse(
    await sendEligibilityVerification({
      gatewayPatientId: resolvedGatewayPatientId,
      patientName: resolvedPatientName,
      patientFirstName,
      patientLastName,
      dob: dob || "",
      payerId: payerId || "",
      memberId,
      providerNpi: providerNpi || "",
      serviceDate: serviceDate || "",
      serviceTypeCode: serviceTypeCode || "30",
      submissionType,
      emrType,
    })
  ) as unknown as EligibilityResult & {
    rawResponse?: unknown;
  };

  const checkRecord = await prisma.eligibilityCheck.create({
    data: {
      clientId: clientContext.clientId,
      gatewayPatientId: resolvedGatewayPatientId,
      patientName: resolvedPatientName,
      patientDob: parseDate(dob),
      memberId,
      payerId,
      payerName,
      providerNpi,
      serviceTypeCode,
      serviceDate: parseDate(serviceDate),
      coverageStatus: toCoverageStatus(result.coverageStatus),
      planName: result.planName,
      planType: result.planType,
      networkStatus: result.networkStatus,
      effectiveDate: parseDate(result.effectiveDate || null),
      terminationDate: parseDate(result.terminationDate || null),
      groupNumber: result.groupNumber,
      benefitsRaw: result.benefitsRaw ? JSON.stringify(result.benefitsRaw) : null,
      confidenceScore: result.confidenceScore,
      responseTimeSeconds: result.responseTimeSeconds,
      channelUsed: result.channelUsed,
      flags: result.flags || [],
      requiresHumanReview: result.requiresHumanReview || false,
      rawResponse: result.rawResponse ? JSON.stringify(result.rawResponse) : null,
      errorMessage: result.error,
      performedById: user?.userId,
    },
  });

  return {
    checkRecordId: checkRecord.id,
    gatewayPatientId: resolvedGatewayPatientId,
    result,
  };
}

async function processBulkBatchJob(
  jobId: string,
  rows: BulkEligibilityRow[],
  user?: AuthenticatedUser,
  clientId?: string | null,
  verificationEngine: "n8n" = "n8n"
): Promise<void> {
  const resultState = createEmptyBulkBatchResult(rows.length, verificationEngine);

  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      resultJson: JSON.stringify(resultState),
      clientId: clientId || user?.clientId || null,
    },
  });

  for (let index = 0; index < rows.length; index += 1) {
    const payload = {
      ...normalizeBulkRow(rows[index] as BulkEligibilityRow),
      clientId: clientId || user?.clientId || "",
      verificationEngine,
    };

    try {
      const execution = await runEligibilityCheck(payload, user);
      resultState.rows.push(buildRowResult(index, payload, execution));
      resultState.successCount += 1;
    } catch (error) {
      resultState.rows.push(
        buildRowResult(index, payload, null, (error as Error).message || "Eligibility check failed")
      );
      resultState.failureCount += 1;
    }

    resultState.completedRows = resultState.rows.length;

    await prisma.automationJob.update({
      where: { id: jobId },
      data: {
        resultJson: JSON.stringify(resultState),
      },
    });
  }

  const finalStatus: AutomationJobStatus =
    resultState.failureCount > 0 && resultState.successCount === 0 ? "FAILED" : "COMPLETED";

  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      errorMessage:
        finalStatus === "FAILED"
          ? "All bulk eligibility rows failed. Review the row errors for details."
          : null,
      resultJson: JSON.stringify(resultState),
    },
  });
}

function assertCanAccessBatch(
  job: { clientId: string | null; triggeredBy: string | null },
  user?: AuthenticatedUser
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "STAFFINGLY_ADMIN" || user.role === "STAFFINGLY_SUPERVISOR") {
    return true;
  }
  if (user.clientId && job.clientId && user.clientId === job.clientId) {
    return true;
  }
  return Boolean(user.email && job.triggeredBy && user.email === job.triggeredBy);
}

export async function checkEligibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const execution = await runEligibilityCheck(req.body as CheckEligibilityBody, req.user);

  res.json({
    ...execution.result,
    checkId: execution.checkRecordId,
    check_id: execution.checkRecordId,
    gatewayPatientId: execution.gatewayPatientId,
    gateway_patient_id: execution.gatewayPatientId,
  });
}

export async function listEhrSystemCatalog(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { clientId } = req.query as ListEhrSystemsQuery;
  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  let connectedSystem: string | null = null;
  if (resolvedClientId) {
    const client = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { emrSystem: true },
    });
    connectedSystem = client?.emrSystem || null;
  }

  res.json({ data: listEhrSystems(connectedSystem) });
}

export async function connectEhrSystem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as ConnectEhrSystemBody;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: body.clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({
      error: "A client workspace is required before connecting an EHR system.",
    });
    return;
  }

  await prisma.client.update({
    where: { id: resolvedClientId },
    data: { emrSystem: ehrSystem.id },
  });

  res.json({
    success: true,
    data: {
      clientId: resolvedClientId,
      emrSystem: ehrSystem.id,
      name: ehrSystem.name,
    },
  });
}

export async function getEhrSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { clientId } = req.query as ListEhrSystemsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({ error: "A client workspace is required before configuring an EHR." });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: resolvedClientId },
    select: {
      id: true,
      emrSystem: true,
      emrConfigJson: true,
    },
  });

  const config = parseEhrConfig(client?.emrConfigJson);

  res.json({
    data: {
      clientId: resolvedClientId,
      emrSystem: client?.emrSystem || "",
      isConnected: client?.emrSystem === ehrSystem.id,
      config: config || {
        environmentLabel: "",
        baseUrl: "",
        authType: "smart_on_fhir",
        clientAppId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "",
        fhirVersion: "R4",
      },
    },
  });
}

export async function saveEhrSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as EhrConfigBody;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: body.clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({ error: "A client workspace is required before configuring an EHR." });
    return;
  }

  const config: EhrConfigRecord = {
    environmentLabel: body.environmentLabel?.trim() || "",
    baseUrl: body.baseUrl?.trim() || "",
    authType: body.authType?.trim() || "smart_on_fhir",
    clientAppId: body.clientAppId?.trim() || "",
    clientSecret: body.clientSecret?.trim() || "",
    redirectUri: body.redirectUri?.trim() || "",
    scopes: body.scopes?.trim() || "",
    fhirVersion: body.fhirVersion?.trim() || "R4",
  };

  if (!config.baseUrl) {
    res.status(400).json({ error: "Base URL is required." });
    return;
  }

  const client = await prisma.client.update({
    where: { id: resolvedClientId },
    data: {
      emrSystem: ehrSystem.id,
      emrConfigJson: JSON.stringify(config),
    },
    select: {
      id: true,
      emrSystem: true,
      emrConfigJson: true,
    },
  });

  res.json({
    success: true,
    data: {
      clientId: client.id,
      emrSystem: client.emrSystem,
      config,
    },
  });
}

export async function searchEmrPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { clientId, search = "", limit = "20" } = req.query as SearchEmrPatientsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const searchTerm = search.trim();
  if (!searchTerm) {
    res.json({ data: [] });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  const subscribers = await prisma.subscriber.findMany({
    where: {
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { memberId: { contains: searchTerm, mode: "insensitive" } },
        { id: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(parseInt(limit || "20", 10) || 20, 50),
  });

  res.json({
    data: subscribers.map((subscriber) => buildEmrPatientProjection(subscriber, ehrSystem.name)),
  });
}

export async function getEmrPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id, patientId } = req.params as { id: string; patientId: string };
  const { clientId } = req.query as SearchEmrPatientsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  const subscriber = await prisma.subscriber.findFirst({
    where: {
      id: patientId,
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
    },
  });

  if (!subscriber) {
    res.status(404).json({ error: "Patient not found in the selected EMR feed" });
    return;
  }

  res.json({
    data: buildEmrPatientProjection(subscriber, ehrSystem.name),
  });
}

export async function createBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, rows, verificationEngine = "n8n" } = req.body as BulkEligibilityBatchBody;
  const clientContext = await resolveEligibilityClientContext({
    clientId,
    user: req.user,
  });
  const resolvedClientId = clientContext.clientId;
  const activeJobs = await prisma.automationJob.findMany({
    where: {
      jobType: "eligibility_bulk",
      status: { in: ["QUEUED", "RUNNING"] },
      clientId: resolvedClientId,
    },
  });

  const queuePosition = activeJobs.filter((job) => job.status === "QUEUED").length + 1;
  const jobRecord = await prisma.automationJob.create({
    data: {
      jobId: `eligibility_bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      jobType: "eligibility_bulk",
      clientId: resolvedClientId,
      payerName:
        rows.length === 1 ? rows[0]?.payer || rows[0]?.payer_id || "Unknown Payer" : "Mixed Payers",
      status: "QUEUED",
      queuePosition,
      triggeredBy: req.user?.email || null,
      resultJson: JSON.stringify(createEmptyBulkBatchResult(rows.length, verificationEngine)),
    },
  });

  setTimeout(() => {
    void processBulkBatchJob(jobRecord.id, rows, req.user, resolvedClientId, verificationEngine);
  }, 0);

  res.status(202).json({
    success: true,
    batchJobId: jobRecord.id,
    jobId: jobRecord.jobId,
    status: jobRecord.status.toLowerCase(),
    queuePosition,
    verificationEngine,
  });
}

export async function getBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const job = await prisma.automationJob.findUnique({
    where: { id },
    select: {
      id: true,
      jobId: true,
      jobType: true,
      clientId: true,
      payerName: true,
      status: true,
      queuePosition: true,
      queuedAt: true,
      startedAt: true,
      completedAt: true,
      triggeredBy: true,
      errorMessage: true,
      resultJson: true,
    },
  });

  if (!job || job.jobType !== "eligibility_bulk") {
    res.status(404).json({ error: "Bulk eligibility batch not found" });
    return;
  }

  if (!assertCanAccessBatch(job, req.user)) {
    res.status(403).json({ error: "You do not have access to this batch job" });
    return;
  }

  res.json({
    id: job.id,
    jobId: job.jobId,
    status: job.status.toLowerCase(),
    queuePosition: job.queuePosition,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    payerName: job.payerName,
    errorMessage: job.errorMessage,
    result: parseJobResult(job),
  });
}

export async function getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    clientId,
    subscriberId,
    memberId,
    limit = "50",
    offset = "0",
    sortBy,
    sortOrder = "desc",
  } = req.query as GetHistoryQuery;

  const where: HistoryWhereClause = {};
  if (clientId) where.clientId = clientId;
  if (subscriberId) where.subscriberId = subscriberId;
  if (memberId) where.memberId = memberId;

  if (req.user?.role === "CLIENT_USER" && req.user?.clientId && !clientId) {
    where.clientId = req.user.clientId;
  }

  const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.eligibilityHistory.findMany({
      where,
      orderBy,
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.eligibilityHistory.count({ where }),
  ]);

  res.json({ data: items, total });
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const check = await prisma.eligibilityCheck.findUnique({
    where: { id },
    include: {
      client: true,
      performedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!check) {
    res.status(404).json({ error: "Eligibility check not found" });
    return;
  }

  res.json(check);
}

export async function createHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const history = await prisma.eligibilityHistory.create({
    data: req.body,
  });

  res.status(201).json(history);
}

export async function updateHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const history = await prisma.eligibilityHistory.update({
    where: { id },
    data: req.body,
  });

  res.json(history);
}
