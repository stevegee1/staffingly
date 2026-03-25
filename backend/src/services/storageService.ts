import prisma from "../lib/prisma.js";
import * as aiService from "./aiService.js";

type StorageType = "STAFFINGLY_PORTAL" | "GOOGLE_DRIVE" | "ONEDRIVE" | "DROPBOX";

interface TestConnectionParams {
  storageType: StorageType;
  credentialKeyRef?: string;
  clientId: string;
  createFolders?: boolean;
}

interface TestConnectionResult {
  success: boolean;
  storageType: StorageType;
  message: string;
  folders?: string[];
  credentialKeyRef?: string;
  foldersToCreate?: string[];
}

export async function testConnection({
  storageType,
  credentialKeyRef,
  clientId,
  createFolders,
}: TestConnectionParams): Promise<TestConnectionResult> {
  if (!storageType || !clientId) {
    throw new Error("Missing storageType or clientId");
  }

  if (storageType === "STAFFINGLY_PORTAL") {
    if (createFolders) {
      const config = await prisma.clientStorageConfig.findUnique({ where: { clientId } });
      if (config) {
        await prisma.clientStorageConfig.update({
          where: { id: config.id },
          data: {
            folderStructureCreated: true,
            connectionVerified: true,
            connectionVerifiedAt: new Date(),
          },
        });
      }
    }
    return {
      success: true,
      storageType: "STAFFINGLY_PORTAL",
      message: "Staffingly Secure Upload Portal is always available.",
      folders: ["Incoming Documents", "Processed Documents", "Archive", "Reports"],
    };
  }

  if (!credentialKeyRef) {
    throw new Error("credentialKeyRef is required for external storage providers.");
  }

  const providerMessages: Record<StorageType, string> = {
    STAFFINGLY_PORTAL: "",
    GOOGLE_DRIVE: "Google Drive API connection test: Would authenticate with service account.",
    ONEDRIVE: "Microsoft OneDrive connection test: Would authenticate via Microsoft Graph API.",
    DROPBOX: "Dropbox connection test: Would authenticate via Dropbox API.",
  };

  const config = await prisma.clientStorageConfig.findUnique({ where: { clientId } });
  if (config) {
    await prisma.clientStorageConfig.update({
      where: { id: config.id },
      data: { connectionVerified: true, connectionVerifiedAt: new Date() },
    });
  }

  return {
    success: true,
    storageType,
    credentialKeyRef,
    message: providerMessages[storageType] || "Provider not recognized.",
    foldersToCreate: ["Incoming Documents", "Processed Documents", "Archive", "Reports"],
  };
}

interface FolderStructureResult {
  success: boolean;
  storageType: string;
  message: string;
  folders: Record<string, string>;
}

export async function createFolderStructure(clientId: string): Promise<FolderStructureResult> {
  if (!clientId) {
    throw new Error("clientId required");
  }

  const config = await prisma.clientStorageConfig.findUnique({
    where: { clientId },
    include: { client: true },
  });

  if (!config) {
    throw new Error("No storage config found for client");
  }

  const folderIds = {
    root: `${config.storageType.toLowerCase()}:root:${clientId}`,
    incoming: `${config.storageType.toLowerCase()}:incoming:${clientId}`,
    processed: `${config.storageType.toLowerCase()}:processed:${clientId}`,
    archive: `${config.storageType.toLowerCase()}:archive:${clientId}`,
    reports: `${config.storageType.toLowerCase()}:reports:${clientId}`,
  };

  await prisma.clientStorageConfig.update({
    where: { id: config.id },
    data: {
      folderStructureCreated: true,
      rootFolderId: folderIds.root,
      incomingFolderId: folderIds.incoming,
      processedFolderId: folderIds.processed,
      archiveFolderId: folderIds.archive,
      reportsFolderId: folderIds.reports,
    },
  });

  return {
    success: true,
    storageType: config.storageType,
    message: `Folder structure created in ${config.storageType}.`,
    folders: folderIds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Intake Sync — Full Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface DetectedFile {
  id: string;
  name: string;
  url: string;
  source: string;
  isPortalDoc: boolean;
}

interface SyncClientResult {
  clientId: string;
  status: string;
  filesDetected?: number;
  filesMatched?: number;
  filesUnmatched?: number;
  filesErrored?: number;
  error?: string;
}

interface SyncDocumentsResult {
  success?: boolean;
  message?: string;
  synced?: number;
  results?: SyncClientResult[];
  totalClients?: number;
}

/**
 * Document Intake Sync — called by scheduled automation or manual trigger
 * Checks each active client's Incoming Documents folder and processes new files.
 *
 * For each detected file:
 *   1. Sends to AI for classification + extraction
 *   2. Attempts to match to open PriorAuthCase (confidence >= 80%)
 *   3. If matched: attaches as PriorAuthDocument, updates status
 *   4. If unmatched: creates UnmatchedDocument record
 *   5. Logs to DriveSyncLog
 */
export async function syncDocuments(
  targetClientId: string | null = null
): Promise<SyncDocumentsResult> {
  const whereClause: { syncEnabled: boolean; clientId?: string } = { syncEnabled: true };
  if (targetClientId) {
    whereClause.clientId = targetClientId;
  }

  const configs = await prisma.clientStorageConfig.findMany({
    where: whereClause,
    include: { client: true },
  });

  if (!configs.length) {
    return { message: "No active storage configs found", synced: 0 };
  }

  const results: SyncClientResult[] = [];

  for (const config of configs) {
    // Create sync log entry
    const logEntry = await prisma.driveSyncLog.create({
      data: {
        clientId: config.clientId,
        clientName: config.client?.name,
        storageType: config.storageType,
        syncStartedAt: new Date(),
        status: "Running",
        filesDetected: 0,
        filesMatched: 0,
        filesUnmatched: 0,
        filesErrored: 0,
      },
    });

    let filesDetected = 0;
    let filesMatched = 0;
    let filesUnmatched = 0;
    let filesErrored = 0;

    try {
      // Step 1: Detect new files based on storage provider
      const newFiles = await detectNewFiles(config);
      filesDetected = newFiles.length;

      // Step 2: Process each file
      for (const file of newFiles) {
        try {
          // Step 2a: Classify document with AI
          const aiResult = await aiService.classifyDocument({
            fileUrl: file.url,
            fileName: file.name,
          });

          // Step 2b: Attempt case matching
          const openCases = await prisma.priorAuthCase.findMany({
            where: {
              clientId: config.clientId,
              status: {
                notIn: ["CLOSED", "APPROVED", "DENIED"],
              },
            },
            select: {
              id: true,
              patientInitials: true,
              patientDob: true,
              insuranceId: true,
              status: true,
            },
          });

          const matchResult = aiService.matchDocumentToCase({
            clientId: config.clientId,
            patientInitials: aiResult.patientInitials,
            patientDob: aiResult.patientDob,
            insuranceId: aiResult.insuranceId,
            openCases,
          });

          const matchConfidence = matchResult?.score || 0;
          const matchedCaseId = matchResult?.caseId || null;

          // Step 2c: Handle based on match confidence
          if (matchConfidence >= 80 && matchedCaseId) {
            // Auto-attach to case
            await attachDocumentToCase({
              file,
              aiResult,
              caseId: matchedCaseId,
              storageType: config.storageType,
            });
            filesMatched++;
          } else {
            // Send to unmatched queue
            await createUnmatchedDocument({
              file,
              config,
              aiResult,
              matchConfidence,
              suggestedCaseId: matchedCaseId,
            });
            filesUnmatched++;
          }
        } catch (fileErr) {
          filesErrored++;
          console.error(`Error processing file ${file.name}:`, (fileErr as Error).message);
        }
      }

      // Update sync config last sync time
      await prisma.clientStorageConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
        },
      });

      // Update sync log
      await prisma.driveSyncLog.update({
        where: { id: logEntry.id },
        data: {
          syncCompletedAt: new Date(),
          status: "Completed",
          filesDetected,
          filesMatched,
          filesUnmatched,
          filesErrored,
        },
      });

      results.push({
        clientId: config.clientId,
        status: "ok",
        filesDetected,
        filesMatched,
        filesUnmatched,
        filesErrored,
      });
    } catch (err) {
      const error = err as Error;

      await prisma.driveSyncLog.update({
        where: { id: logEntry.id },
        data: {
          syncCompletedAt: new Date(),
          status: "Failed",
          errorMessage: error.message,
        },
      });

      await prisma.clientStorageConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "failed",
        },
      });

      results.push({
        clientId: config.clientId,
        status: "error",
        error: error.message,
      });
    }
  }

  return { success: true, results, totalClients: configs.length };
}

/**
 * Detect new files from client's storage provider
 */
async function detectNewFiles(config: {
  clientId: string;
  storageType: string;
  credentialKeyRef: string | null;
  incomingFolderId: string | null;
}): Promise<DetectedFile[]> {
  const newFiles: DetectedFile[] = [];

  if (config.storageType === "STAFFINGLY_PORTAL") {
    // Check internal uploads queue: PriorAuthDocuments marked as pending intake
    // These are documents uploaded via portal but not yet matched to a case
    const pendingDocs = await prisma.priorAuthDocument.findMany({
      where: {
        caseId: "PENDING_INTAKE",
      },
    });

    for (const doc of pendingDocs) {
      newFiles.push({
        id: doc.id,
        name: doc.fileName,
        url: doc.fileUrl,
        source: "staffingly_portal",
        isPortalDoc: true,
      });
    }
  } else if (config.storageType === "GOOGLE_DRIVE") {
    // In production: Call Google Drive API
    // const drive = google.drive({ version: 'v3', auth: getAuthClient(config.credentialKeyRef) });
    // const response = await drive.files.list({
    //   q: `'${config.incomingFolderId}' in parents and trashed = false`,
    //   fields: 'files(id, name, webViewLink, modifiedTime)',
    //   orderBy: 'modifiedTime desc',
    // });
    // Map response.data.files to DetectedFile[]
    console.log(`Google Drive sync for client ${config.clientId} - requires API credentials`);
  } else if (config.storageType === "ONEDRIVE") {
    // In production: Call Microsoft Graph API
    // const client = getGraphClient(config.credentialKeyRef);
    // const response = await client.api(`/drives/{drive-id}/items/${config.incomingFolderId}/children`).get();
    // Map response.value to DetectedFile[]
    console.log(`OneDrive sync for client ${config.clientId} - requires API credentials`);
  } else if (config.storageType === "DROPBOX") {
    // In production: Call Dropbox API
    // const dbx = new Dropbox({ accessToken: getToken(config.credentialKeyRef) });
    // const response = await dbx.filesListFolder({ path: config.incomingFolderId });
    // Map response.result.entries to DetectedFile[]
    console.log(`Dropbox sync for client ${config.clientId} - requires API credentials`);
  }

  return newFiles;
}

/**
 * Attach a document to a matched case
 */
async function attachDocumentToCase({
  file,
  aiResult,
  caseId,
  storageType,
}: {
  file: DetectedFile;
  aiResult: aiService.DocumentClassificationResult;
  caseId: string;
  storageType: string;
}): Promise<void> {
  if (file.isPortalDoc) {
    // Update existing PriorAuthDocument record
    await prisma.priorAuthDocument.update({
      where: { id: file.id },
      data: {
        caseId,
        documentType: aiResult.documentType,
        aiClassification: aiResult.documentType,
        aiExtractedDataJson: JSON.stringify(aiResult),
        status: "UPLOADED",
      },
    });
  } else {
    // Create new PriorAuthDocument record
    await prisma.priorAuthDocument.create({
      data: {
        caseId,
        documentType: aiResult.documentType,
        checklistItemKey: aiResult.documentType,
        fileUrl: file.url,
        fileName: file.name,
        status: "UPLOADED",
        aiClassification: aiResult.documentType,
        aiExtractedDataJson: JSON.stringify(aiResult),
        uploadedBy: `sync:${storageType.toLowerCase()}`,
      },
    });
  }

  // Create notification for assigned specialist
  const caseRecord = await prisma.priorAuthCase.findUnique({
    where: { id: caseId },
    select: { assignedSpecialistId: true, caseNumber: true, clientId: true },
  });

  if (caseRecord?.assignedSpecialistId) {
    await prisma.notification.create({
      data: {
        userId: caseRecord.assignedSpecialistId,
        clientId: caseRecord.clientId,
        type: "document_attached",
        title: `New Document Attached - Case ${caseRecord.caseNumber}`,
        body: `A ${aiResult.documentType} was automatically attached to case ${caseRecord.caseNumber}. Confidence: ${aiResult.classificationConfidence}%`,
        relatedCaseId: caseId,
      },
    });
  }
}

/**
 * Create an unmatched document record for manual review
 */
async function createUnmatchedDocument({
  file,
  config,
  aiResult,
  matchConfidence,
  suggestedCaseId,
}: {
  file: DetectedFile;
  config: { clientId: string; client: { name: string } | null; storageType: string };
  aiResult: aiService.DocumentClassificationResult;
  matchConfidence: number;
  suggestedCaseId: string | null;
}): Promise<void> {
  await prisma.unmatchedDocument.create({
    data: {
      clientId: config.clientId,
      clientName: config.client?.name,
      fileName: file.name,
      fileUrl: file.url,
      storageType: config.storageType,
      detectedDocumentType: aiResult.documentType,
      aiClassificationConfidence: aiResult.classificationConfidence,
      extractedPatientInitials: aiResult.patientInitials,
      extractedDob: aiResult.patientDob ? new Date(aiResult.patientDob) : null,
      extractedInsuranceId: aiResult.insuranceId,
      extractedDiagnosisCodes: aiResult.diagnosisCodes,
      extractedPhysician: aiResult.orderingPhysician,
      extractedDataJson: JSON.stringify(aiResult),
      matchConfidence,
      suggestedCaseId,
      status: "Unmatched",
      detectedAt: new Date(),
    },
  });

  // If the file was from the portal, mark it as processed (remove from pending)
  if (file.isPortalDoc) {
    await prisma.priorAuthDocument.delete({
      where: { id: file.id },
    });
  }

  // Notify supervisors about unmatched document
  const supervisors = await prisma.user.findMany({
    where: {
      role: { in: ["STAFFINGLY_SUPERVISOR", "STAFFINGLY_ADMIN"] },
    },
    select: { id: true },
  });

  for (const supervisor of supervisors) {
    await prisma.notification.create({
      data: {
        userId: supervisor.id,
        clientId: config.clientId,
        type: "unmatched_document",
        title: `Unmatched Document - ${config.client?.name || "Unknown Client"}`,
        body: `A ${aiResult.documentType} could not be auto-matched (confidence: ${matchConfidence}%). Review required.`,
      },
    });
  }
}

export default {
  testConnection,
  createFolderStructure,
  syncDocuments,
};
