import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const getStaff = async (_req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: staff,
  });
};

export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const staff = await prisma.staff.findUnique({
    where: { id: parseInt(id) },
  });

  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff member not found",
    });
    return;
  }

  res.json({
    success: true,
    data: staff,
  });
};

export const createStaff = async (req: Request, res: Response): Promise<void> => {
  const { name, email, department } = req.body;

  const staff = await prisma.staff.create({
    data: {
      name,
      email,
      department,
    },
  });

  res.status(201).json({
    success: true,
    data: staff,
  });
};

export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { name, email, department, verified } = req.body;

  const staff = await prisma.staff.update({
    where: { id: parseInt(id) },
    data: {
      name,
      email,
      department,
      verified,
    },
  });

  res.json({
    success: true,
    data: staff,
  });
};

export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.staff.delete({
    where: { id: parseInt(id) },
  });

  res.json({
    success: true,
    message: "Staff member deleted successfully",
  });
};
