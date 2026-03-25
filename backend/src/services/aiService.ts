import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface DocumentClassificationResult {
  documentType: string;
  classificationConfidence: number;
  patientInitials: string | null;
  patientDob: string | null;
  insuranceId: string | null;
  diagnosisCodes: string[];
  medications: string[];
  orderingPhysician: string | null;
  serviceDates: string[];
  keyDataSummary: string;
}

interface ClassifyDocumentParams {
  fileUrl: string;
  fileName?: string;
}

export async function classifyDocument({
  fileUrl,
  fileName,
}: ClassifyDocumentParams): Promise<DocumentClassificationResult> {
  const anthropic = getAnthropic();

  const systemPrompt = `You are a medical document classifier for a prior authorization system.
Analyze documents and extract all patient identifiers and clinical data.

Return a JSON object with:
- document_type: string (e.g. "Clinical Notes", "Lab Results", "Letter of Medical Necessity", "Imaging Report", "Prescription", "Prior Treatment Records", "Physician Order", "Denial Letter", "Appeal Letter", "Other")
- classification_confidence: number 0-100
- patient_initials: string or null (first letter of first name + first letter of last name)
- patient_dob: string (YYYY-MM-DD format) or null
- insurance_id: string or null (member ID from insurance card)
- diagnosis_codes: array of ICD-10 code strings
- medications: array of medication name strings
- ordering_physician: string or null (full name if found)
- service_dates: array of date strings in YYYY-MM-DD format
- key_data_summary: string (1-2 sentence summary of what this document contains)

Be thorough in extracting identifiers. If uncertain about a field, return null rather than guessing.`;

  const userPrompt = `Analyze this medical document${fileName ? ` (${fileName})` : ""} and extract all relevant information.

Document URL: ${fileUrl}

Return your analysis as valid JSON matching the schema described.`;

  try {
    // Check if URL is an image or PDF
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);

    let content: Anthropic.MessageCreateParams["messages"][0]["content"];

    if (isImage) {
      // For images, use vision capability
      const imageResponse = await fetch(fileUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      const mediaType = fileUrl.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";

      content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Image,
          },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ];
    } else if (isPdf) {
      // For PDFs, use document capability
      const pdfResponse = await fetch(fileUrl);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

      content = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Pdf,
          },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ];
    } else {
      // For other file types, just send the URL as text context
      content = [
        {
          type: "text",
          text: `${userPrompt}\n\nNote: Unable to directly process this file type. Please analyze based on the filename and any available context.`,
        },
      ];
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Extract text content from response
    const textBlock = response.content.find((block: { type: string }) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      documentType: parsed.document_type || "Other",
      classificationConfidence: parsed.classification_confidence || 50,
      patientInitials: parsed.patient_initials || null,
      patientDob: parsed.patient_dob || null,
      insuranceId: parsed.insurance_id || null,
      diagnosisCodes: parsed.diagnosis_codes || [],
      medications: parsed.medications || [],
      orderingPhysician: parsed.ordering_physician || null,
      serviceDates: parsed.service_dates || [],
      keyDataSummary: parsed.key_data_summary || "Document processed",
    };
  } catch (error) {
    console.error("AI classification error:", error);

    // Return a fallback result if AI fails
    return {
      documentType: "Other",
      classificationConfidence: 0,
      patientInitials: null,
      patientDob: null,
      insuranceId: null,
      diagnosisCodes: [],
      medications: [],
      orderingPhysician: null,
      serviceDates: [],
      keyDataSummary: `Classification failed: ${(error as Error).message}`,
    };
  }
}

interface CaseMatchScore {
  caseId: string;
  score: number;
  matchedFields: string[];
}

interface MatchCaseParams {
  clientId: string;
  patientInitials: string | null;
  patientDob: string | null;
  insuranceId: string | null;
  openCases: Array<{
    id: string;
    patientInitials: string | null;
    patientDob: Date | null;
    insuranceId: string | null;
    status: string;
  }>;
}

export function matchDocumentToCase({
  patientInitials,
  patientDob,
  insuranceId,
  openCases,
}: MatchCaseParams): CaseMatchScore | null {
  if (!patientInitials && !insuranceId && !patientDob) {
    return null;
  }

  let bestMatch: CaseMatchScore | null = null;

  for (const caseRecord of openCases) {
    // Skip closed/completed cases
    if (["CLOSED", "APPROVED", "DENIED"].includes(caseRecord.status)) {
      continue;
    }

    let score = 0;
    const matchedFields: string[] = [];

    // Insurance ID match (highest weight)
    if (insuranceId && caseRecord.insuranceId === insuranceId) {
      score += 50;
      matchedFields.push("insuranceId");
    }

    // Patient initials match
    if (
      patientInitials &&
      caseRecord.patientInitials?.toLowerCase() === patientInitials.toLowerCase()
    ) {
      score += 30;
      matchedFields.push("patientInitials");
    }

    // DOB match
    if (patientDob && caseRecord.patientDob) {
      const docDob = new Date(patientDob).toISOString().split("T")[0];
      const caseDob = caseRecord.patientDob.toISOString().split("T")[0];
      if (docDob === caseDob) {
        score += 20;
        matchedFields.push("patientDob");
      }
    }

    if (score > (bestMatch?.score || 0)) {
      bestMatch = {
        caseId: caseRecord.id,
        score,
        matchedFields,
      };
    }
  }

  return bestMatch;
}

export default {
  classifyDocument,
  matchDocumentToCase,
};
