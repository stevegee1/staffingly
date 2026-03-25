import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import storageService from "../services/storageService.js";
import prisma from "../lib/prisma.js";
import { StorageType } from "@prisma/client";

interface TestConnectionBody {
  storageType: string;
  credentialKeyRef?: string;
  clientId: string;
  createFolders?: boolean;
}

interface CreateFoldersBody {
  clientId: string;
}

interface SyncDocumentsBody {
  clientId?: string;
}

interface UpdateStorageConfigBody {
  storageType?: string;
  credentialKeyRef?: string;
  syncEnabled?: boolean;
}

interface ResolveUnmatchedDocumentBody {
  caseId?: string;
  action: "attach" | "dismiss";
}

interface StorageConfigCreateBody {
  clientId: string;
  storageType?: StorageType;
  credentialKeyRef?: string;
  syncEnabled?: boolean;
}

interface PaginationQuery {
  clientId?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

export async function testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { storageType, credentialKeyRef, clientId, createFolders } = req.body as TestConnectionBody;
  const result = await storageService.testConnection({
    storageType: storageType as StorageType,
    credentialKeyRef,
    clientId,
    createFolders,
  });
  res.json(result);
}

export async function createFolders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId } = req.body as CreateFoldersBody;
  const result = await storageService.createFolderStructure(clientId);
  res.json(result);
}

export async function syncDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId } = req.body as SyncDocumentsBody;
  const result = await storageService.syncDocuments(clientId);
  res.json(result);
}

export async function getStorageConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId } = req.params as { clientId: string };

  const config = await prisma.clientStorageConfig.findUnique({
    where: { clientId },
    include: { client: true },
  });

  if (!config) {
    res.status(404).json({ error: "Storage config not found" });
    return;
  }

  res.json(config);
}

export async function updateStorageConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId } = req.params as { clientId: string };
  const { storageType, credentialKeyRef, syncEnabled } = req.body as UpdateStorageConfigBody;

  const config = await prisma.clientStorageConfig.upsert({
    where: { clientId },
    update: { storageType: storageType as StorageType, credentialKeyRef, syncEnabled },
    create: {
      clientId,
      storageType: (storageType as StorageType) || StorageType.STAFFINGLY_PORTAL,
      credentialKeyRef,
      syncEnabled: syncEnabled ?? true,
    },
  });

  res.json(config);
}

export async function getSyncLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, limit = "50", offset = "0" } = req.query as PaginationQuery;

  const where: { clientId?: string } = {};
  if (clientId) where.clientId = clientId;

  const [logs, total] = await Promise.all([
    prisma.driveSyncLog.findMany({
      where,
      orderBy: { syncStartedAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.driveSyncLog.count({ where }),
  ]);

  res.json({ logs, total });
}

export async function getUnmatchedDocuments(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { clientId, status, limit = "50", offset = "0" } = req.query as PaginationQuery;

  const where: { clientId?: string; status?: string } = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;

  const [documents, total] = await Promise.all([
    prisma.unmatchedDocument.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: { client: true },
    }),
    prisma.unmatchedDocument.count({ where }),
  ]);

  res.json({ documents, total });
}

export async function resolveUnmatchedDocument(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params as { id: string };
  const { caseId, action } = req.body as ResolveUnmatchedDocumentBody;

  const doc = await prisma.unmatchedDocument.findUnique({ where: { id } });

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (action === "attach" && caseId) {
    await prisma.priorAuthDocument.create({
      data: {
        caseId,
        documentType: doc.detectedDocumentType || "Other",
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        status: "UPLOADED",
        aiClassification: doc.detectedDocumentType,
        aiExtractedDataJson: doc.extractedDataJson,
        uploadedBy: `resolved:${req.user?.email}`,
      },
    });
  }

  await prisma.unmatchedDocument.update({
    where: { id },
    data: {
      status: action === "attach" ? "Resolved" : "Dismissed",
      resolvedAt: new Date(),
      resolvedBy: req.user?.email,
    },
  });

  res.json({ success: true });
}

export async function listStorageConfigs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, limit = "100", offset = "0" } = req.query as PaginationQuery;

  const where: { clientId?: string } = {};
  if (clientId) where.clientId = clientId;

  const [configs, total] = await Promise.all([
    prisma.clientStorageConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.clientStorageConfig.count({ where }),
  ]);

  res.json({ data: configs, total });
}

export async function createStorageConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const config = await prisma.clientStorageConfig.create({
    data: req.body as StorageConfigCreateBody,
  });

  res.status(201).json(config);
}

export async function updateStorageConfigById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const config = await prisma.clientStorageConfig.update({
    where: { id: req.params.id as string },
    data: req.body as Partial<Omit<StorageConfigCreateBody, "clientId">>,
  });

  res.json(config);
}
