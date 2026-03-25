import type { Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest, ApiResponse } from "../types/index.js";

export const getPayerRules = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const {
    page = "1",
    limit = "50",
    payerName,
    serviceType,
    automationSupported,
  } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, any> = {};

  if (payerName) {
    where.payerName = { contains: payerName, mode: "insensitive" };
  }

  if (serviceType) {
    where.serviceType = serviceType;
  }

  if (automationSupported !== undefined) {
    where.automationSupported = automationSupported === "true";
  }

  const [rules, total] = await Promise.all([
    prisma.payerRule.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { payerName: "asc" },
    }),
    prisma.payerRule.count({ where }),
  ]);

  res.json({
    success: true,
    data: rules,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getPayerRuleById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };

  const rule = await prisma.payerRule.findUnique({
    where: { id },
  });

  if (!rule) {
    res.status(404).json({
      success: false,
      message: "Payer rule not found",
    });
    return;
  }

  res.json({
    success: true,
    data: rule,
  });
};

export const createPayerRule = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const data = req.body;

  const rule = await prisma.payerRule.create({
    data: {
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      requiresPriorAuth: data.requiresPriorAuth ?? true,
      submissionMethod: data.submissionMethod,
      portalUrl: data.portalUrl,
      phoneNumber: data.phoneNumber,
      faxNumber: data.faxNumber,
      turnaroundDays: data.turnaroundDays,
      requiredDocuments: data.requiredDocuments || [],
      automationSupported: data.automationSupported ?? false,
      fieldMappingJson: data.fieldMappingJson,
      notes: data.notes,
    },
  });

  res.status(201).json({
    success: true,
    data: rule,
  });
};

export const updatePayerRule = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };
  const data = req.body;

  const rule = await prisma.payerRule.update({
    where: { id },
    data: {
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      requiresPriorAuth: data.requiresPriorAuth,
      submissionMethod: data.submissionMethod,
      portalUrl: data.portalUrl,
      phoneNumber: data.phoneNumber,
      faxNumber: data.faxNumber,
      turnaroundDays: data.turnaroundDays,
      requiredDocuments: data.requiredDocuments,
      automationSupported: data.automationSupported,
      fieldMappingJson: data.fieldMappingJson,
      notes: data.notes,
    },
  });

  res.json({
    success: true,
    data: rule,
  });
};

export const deletePayerRule = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.payerRule.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "Payer rule deleted successfully",
  });
};
