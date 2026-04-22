import type { Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { role, clientId, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (clientId) where.clientId = clientId;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    total,
  });
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      client: true,
    },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, name, role, clientId, active, accountLocked } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: "User with this email already exists",
    });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      clientId,
      ...(active !== undefined && { active }),
      ...(accountLocked !== undefined && { accountLocked }),
    },
    include: {
      client: true,
    },
  });

  res.status(201).json({
    success: true,
    data: user,
  });
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { email, name, role, clientId, active, accountLocked } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      email,
      name,
      role,
      clientId,
      ...(active !== undefined && { active }),
      ...(accountLocked !== undefined && { accountLocked }),
    },
    include: {
      client: true,
    },
  });

  res.json({
    success: true,
    data: user,
  });
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.user.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "User deleted successfully",
  });
};
