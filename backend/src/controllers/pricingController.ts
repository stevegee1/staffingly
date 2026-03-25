import type { Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest, ApiResponse } from "../types/index.js";

export const getPackages = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { page = "1", limit = "20", isActive } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, any> = {};

  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const [packages, total] = await Promise.all([
    prisma.pricingPackage.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            billingProfiles: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingPackage.count({ where }),
  ]);

  res.json({
    success: true,
    data: packages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getPackageById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };

  const pkg = await prisma.pricingPackage.findUnique({
    where: { id },
    include: {
      billingProfiles: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!pkg) {
    res.status(404).json({
      success: false,
      message: "Pricing package not found",
    });
    return;
  }

  res.json({
    success: true,
    data: pkg,
  });
};

export const createPackage = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const data = req.body;

  const pkg = await prisma.pricingPackage.create({
    data: {
      name: data.name,
      description: data.description,
      monthlyBaseFee: data.monthlyBaseFee || 0,
      ratePerEligibilityCheck: data.ratePerEligibilityCheck || 0,
      ratePerPriorAuth: data.ratePerPriorAuth || 0,
      ratePerApprovedPriorAuth: data.ratePerApprovedPriorAuth || 0,
      ratePerAppeal: data.ratePerAppeal || 0,
      includedEligibilityChecks: data.includedEligibilityChecks || 0,
      includedPriorAuths: data.includedPriorAuths || 0,
      includedAppeals: data.includedAppeals || 0,
      unlimitedEligibility: data.unlimitedEligibility || false,
      unlimitedPriorAuths: data.unlimitedPriorAuths || false,
      unlimitedAppeals: data.unlimitedAppeals || false,
      chargeOnApproval: data.chargeOnApproval || false,
      overageRateEligibility: data.overageRateEligibility,
      overageRatePriorAuth: data.overageRatePriorAuth,
      isActive: data.isActive ?? true,
    },
  });

  res.status(201).json({
    success: true,
    data: pkg,
  });
};

export const updatePackage = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };
  const data = req.body;

  const pkg = await prisma.pricingPackage.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      monthlyBaseFee: data.monthlyBaseFee,
      ratePerEligibilityCheck: data.ratePerEligibilityCheck,
      ratePerPriorAuth: data.ratePerPriorAuth,
      ratePerApprovedPriorAuth: data.ratePerApprovedPriorAuth,
      ratePerAppeal: data.ratePerAppeal,
      includedEligibilityChecks: data.includedEligibilityChecks,
      includedPriorAuths: data.includedPriorAuths,
      includedAppeals: data.includedAppeals,
      unlimitedEligibility: data.unlimitedEligibility,
      unlimitedPriorAuths: data.unlimitedPriorAuths,
      unlimitedAppeals: data.unlimitedAppeals,
      chargeOnApproval: data.chargeOnApproval,
      overageRateEligibility: data.overageRateEligibility,
      overageRatePriorAuth: data.overageRatePriorAuth,
      isActive: data.isActive,
    },
  });

  res.json({
    success: true,
    data: pkg,
  });
};

export const deletePackage = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.pricingPackage.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "Pricing package deleted successfully",
  });
};
