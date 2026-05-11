import prisma from "../lib/prisma.js";
import * as availityService from "./availityService.js";
import * as automationService from "./automationService.js";

type Channel = "EDI" | "FHIR" | "RPA";

export interface MultiChannelEligibilityInput {
  patientName: string;
  dob: string;
  memberId: string;
  payerId?: string;
  payerName?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
  clientId?: string;
  patientId?: string;
  triggeredBy?: string;
}

export interface MultiChannelEligibilityResult {
  success: boolean;
  coverageStatus: string;
  planName: string;
  planType: string;
  networkStatus: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  groupNumber: string | null;
  benefitsRaw: unknown;
  confidenceScore: number;
  responseTimeSeconds: number;
  channelUsed: string;
  flags: string[];
  requiresHumanReview: boolean;
  rawResponse?: unknown;
  error?: string;
  routingTrace: Array<{
    channel: Channel;
    status: "success" | "failed" | "queued" | "skipped";
    detail: string;
  }>;
  automationJobId?: string;
}

interface PayerCapabilityProfile {
  payerRuleId: string | null;
  payerName: string;
  payerId: string | null;
  supportsEdi: boolean;
  supportsFhir: boolean;
  supportsRpa: boolean;
  portalUrl: string | null;
  source: "payer_rule" | "fallback";
}

const FHIR_ELIGIBILITY_URL = process.env.FHIR_ELIGIBILITY_URL;
const FHIR_ELIGIBILITY_TOKEN = process.env.FHIR_ELIGIBILITY_TOKEN;

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() || "";
}

function parseJsonRecord(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function containsAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function buildFallbackProfile(input: MultiChannelEligibilityInput): PayerCapabilityProfile {
  return {
    payerRuleId: null,
    payerName: input.payerName || "Unknown Payer",
    payerId: input.payerId || null,
    supportsEdi: true,
    supportsFhir: false,
    supportsRpa: false,
    portalUrl: null,
    source: "fallback",
  };
}

async function getPayerCapabilityProfile(
  input: MultiChannelEligibilityInput
): Promise<PayerCapabilityProfile> {
  const payerRule = await prisma.payerRule.findFirst({
    where: {
      OR: [
        input.payerId ? { payerId: input.payerId } : undefined,
        input.payerName
          ? { payerName: { contains: input.payerName, mode: "insensitive" } }
          : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    orderBy: [{ payerId: "desc" }, { payerName: "asc" }],
  });

  if (!payerRule) {
    return buildFallbackProfile(input);
  }

  const submissionMethod = normalizeText(payerRule.submissionMethod);
  const notes = normalizeText(payerRule.notes);
  const fieldMap = parseJsonRecord(payerRule.fieldMappingJson);
  const channelHints = normalizeText(String(fieldMap.channelPreference || fieldMap.supportedChannels || ""));
  const supportsFhirHint =
    fieldMap.supportsFhir === true ||
    containsAny(`${submissionMethod} ${notes} ${channelHints}`, ["fhir", "coverageeligibilityrequest"]);
  const supportsEdiHint =
    fieldMap.supportsEdi === true ||
    containsAny(`${submissionMethod} ${notes} ${channelHints}`, ["edi", "270", "271", "availity"]);

  return {
    payerRuleId: payerRule.id,
    payerName: payerRule.payerName,
    payerId: payerRule.payerId || input.payerId || null,
    supportsEdi: supportsEdiHint || !supportsFhirHint,
    supportsFhir: supportsFhirHint,
    supportsRpa: Boolean(payerRule.automationSupported || payerRule.portalUrl),
    portalUrl: payerRule.portalUrl || null,
    source: "payer_rule",
  };
}

function mapAvailityError(result: Awaited<ReturnType<typeof availityService.checkEligibility>>): string {
  if ("error" in result) {
    return `${result.error}${result.details ? `: ${result.details}` : ""}`;
  }
  return "EDI verification failed";
}

function mapAvailitySuccess(
  result: Awaited<ReturnType<typeof availityService.checkEligibility>>,
  routingTrace: MultiChannelEligibilityResult["routingTrace"]
): MultiChannelEligibilityResult {
  if ("error" in result) {
    throw new Error("Expected a successful Availity response.");
  }

  return {
    success: true,
    coverageStatus: result.coverageStatus,
    planName: result.planName,
    planType: result.planType,
    networkStatus: result.networkStatus,
    effectiveDate: result.effectiveDate,
    terminationDate: result.terminationDate,
    groupNumber: result.groupNumber,
    benefitsRaw: result.benefitsRaw,
    confidenceScore: result.confidenceScore,
    responseTimeSeconds: result.responseTimeSeconds,
    channelUsed: result.channelUsed || "StaffVerify In-App EV Engine (EDI 270/271)",
    flags: result.flags || [],
    requiresHumanReview: result.requiresHumanReview || false,
    rawResponse: result.rawResponse,
    routingTrace,
  };
}

async function tryFhirEligibility(
  input: MultiChannelEligibilityInput,
  routingTrace: MultiChannelEligibilityResult["routingTrace"]
): Promise<MultiChannelEligibilityResult | null> {
  if (!FHIR_ELIGIBILITY_URL || !FHIR_ELIGIBILITY_TOKEN) {
    routingTrace.push({
      channel: "FHIR",
      status: "failed",
      detail: "FHIR channel is not configured.",
    });
    return null;
  }

  const startedAt = Date.now();
  const response = await fetch(FHIR_ELIGIBILITY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FHIR_ELIGIBILITY_TOKEN}`,
    },
    body: JSON.stringify({
      resourceType: "CoverageEligibilityRequest",
      purpose: ["validation", "benefits"],
      patient: {
        display: input.patientName,
      },
      created: new Date().toISOString(),
      insurer: {
        identifier: {
          value: input.payerId || input.payerName || "",
        },
      },
      provider: {
        identifier: {
          value: input.providerNpi || "",
        },
      },
      servicingFacility: {
        display: "StaffVerify",
      },
      insurance: [
        {
          focal: true,
          coverage: {
            identifier: {
              value: input.memberId,
            },
          },
        },
      ],
      item: [
        {
          category: {
            coding: [{ code: input.serviceTypeCode || "30" }],
          },
          servicedDate: input.serviceDate,
        },
      ],
    }),
  });

  const responseTimeSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
  if (!response.ok) {
    routingTrace.push({
      channel: "FHIR",
      status: "failed",
      detail: `FHIR CoverageEligibilityRequest failed with ${response.status}.`,
    });
    return null;
  }

  const rawResponse = (await response.json()) as Record<string, unknown>;
  const disposition =
    typeof rawResponse.disposition === "string" ? rawResponse.disposition : "FHIR eligibility response";
  const outcome = typeof rawResponse.outcome === "string" ? rawResponse.outcome : "unknown";
  const insurance = Array.isArray(rawResponse.insurance) ? rawResponse.insurance[0] : null;
  const inforce =
    insurance && typeof insurance === "object" && insurance !== null && "inforce" in insurance
      ? Boolean((insurance as Record<string, unknown>).inforce)
      : outcome === "complete";

  routingTrace.push({
    channel: "FHIR",
    status: "success",
    detail: "FHIR CoverageEligibilityRequest completed successfully.",
  });

  return {
    success: true,
    coverageStatus: inforce ? "Active" : "Unknown",
    planName: disposition,
    planType: "FHIR Eligibility",
    networkStatus: "Verify with payer",
    effectiveDate: null,
    terminationDate: null,
    groupNumber: null,
    benefitsRaw: rawResponse,
    confidenceScore: inforce ? 72 : 60,
    responseTimeSeconds,
    channelUsed: "StaffVerify In-App EV Engine (FHIR CoverageEligibilityRequest)",
    flags: inforce ? [] : ["FHIR returned limited benefit detail — review coverage manually if needed."],
    requiresHumanReview: !inforce,
    rawResponse,
    routingTrace,
  };
}

async function queueRpaFallback(
  input: MultiChannelEligibilityInput,
  capability: PayerCapabilityProfile,
  routingTrace: MultiChannelEligibilityResult["routingTrace"]
): Promise<MultiChannelEligibilityResult> {
  const automationJob = await automationService.triggerJob({
    jobType: "eligibility_portal_verification",
    payerName: capability.payerName || input.payerName || "Unknown Payer",
    urgency: "ROUTINE",
    triggeredBy: input.triggeredBy,
    payload: {
      patientName: input.patientName,
      dob: input.dob,
      memberId: input.memberId,
      payerId: capability.payerId || input.payerId || "",
      payerName: capability.payerName || input.payerName || "",
      providerNpi: input.providerNpi || "",
      serviceTypeCode: input.serviceTypeCode || "30",
      serviceDate: input.serviceDate || "",
      clientId: input.clientId || "",
      patientId: input.patientId || "",
      portalUrl: capability.portalUrl || "",
    },
  });

  routingTrace.push({
    channel: "RPA",
    status: "queued",
    detail: `Portal verification queued as automation job ${automationJob.jobId}.`,
  });

  return {
    success: true,
    coverageStatus: "Unknown",
    planName: "Pending portal verification",
    planType: "Portal/RPA",
    networkStatus: "Pending automation",
    effectiveDate: null,
    terminationDate: null,
    groupNumber: null,
    benefitsRaw: [],
    confidenceScore: 40,
    responseTimeSeconds: 0,
    channelUsed: "StaffVerify In-App EV Engine (RPA Fallback Queued)",
    flags: [
      "Electronic channels were unavailable or unsuccessful. Portal automation was queued for payer follow-up.",
    ],
    requiresHumanReview: true,
    rawResponse: {
      automationJobId: automationJob.jobId,
      queuePosition: automationJob.queuePosition,
    },
    routingTrace,
    automationJobId: automationJob.jobId,
  };
}

export async function verifyEligibilityMultiChannel(
  input: MultiChannelEligibilityInput
): Promise<MultiChannelEligibilityResult> {
  const capability = await getPayerCapabilityProfile(input);
  const routingTrace: MultiChannelEligibilityResult["routingTrace"] = [];

  if (capability.supportsEdi) {
    const ediResult = await availityService.checkEligibility({
      patientName: input.patientName,
      dob: input.dob,
      memberId: input.memberId,
      payerId: capability.payerId || input.payerId,
      providerNpi: input.providerNpi,
      serviceTypeCode: input.serviceTypeCode,
      serviceDate: input.serviceDate,
    });

    if ("error" in ediResult) {
      routingTrace.push({
        channel: "EDI",
        status: "failed",
        detail: mapAvailityError(ediResult),
      });
    } else {
      routingTrace.push({
        channel: "EDI",
        status: "success",
        detail: "EDI 270/271 verification completed successfully.",
      });
      return mapAvailitySuccess(ediResult, routingTrace);
    }
  } else {
    routingTrace.push({
      channel: "EDI",
      status: "skipped",
      detail: "Payer capability profile does not prefer EDI for this verification.",
    });
  }

  if (capability.supportsFhir) {
    const fhirResult = await tryFhirEligibility(input, routingTrace);
    if (fhirResult) {
      return fhirResult;
    }
  } else {
    routingTrace.push({
      channel: "FHIR",
      status: "skipped",
      detail: "FHIR is not enabled for this payer profile.",
    });
  }

  if (capability.supportsRpa) {
    return queueRpaFallback(input, capability, routingTrace);
  }

  routingTrace.push({
    channel: "RPA",
    status: "skipped",
    detail: "No portal automation fallback is configured for this payer.",
  });

  return {
    success: false,
    coverageStatus: "Unknown",
    planName: "",
    planType: "",
    networkStatus: "",
    effectiveDate: null,
    terminationDate: null,
    groupNumber: null,
    benefitsRaw: [],
    confidenceScore: 0,
    responseTimeSeconds: 0,
    channelUsed: "StaffVerify In-App EV Engine",
    flags: [
      "All configured channels were unavailable. Update payer capabilities or use the n8n gateway for this payer.",
    ],
    requiresHumanReview: true,
    error: "No available verification channel succeeded for this payer.",
    routingTrace,
  };
}

export default {
  verifyEligibilityMultiChannel,
};
