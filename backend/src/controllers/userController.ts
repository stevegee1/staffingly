import type { Response } from "express";
import prisma from "../lib/prisma.js";
import {
  matchesDevice,
  normalizeRegisteredDevices,
  removeRegisteredDevice,
  toRegisteredDevicesJson,
  type DeviceTarget,
} from "../lib/deviceSessions.js";
import { sanitizeAllowedIpAddresses } from "../lib/ipSecurity.js";
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
  const {
    email,
    name,
    role,
    clientId,
    active,
    accountLocked,
    allowedIpAddresses,
    registeredDevices,
  } = req.body;

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
      allowedIpAddresses: sanitizeAllowedIpAddresses(allowedIpAddresses),
      ...(registeredDevices !== undefined && { registeredDevices }),
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
  const {
    email,
    name,
    role,
    clientId,
    active,
    accountLocked,
    allowedIpAddresses,
    registeredDevices,
  } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  const previousDevices = normalizeRegisteredDevices(existingUser.registeredDevices);
  const nextDevices =
    registeredDevices !== undefined
      ? normalizeRegisteredDevices(registeredDevices)
      : previousDevices;
  const removedDevices =
    registeredDevices !== undefined
      ? previousDevices.filter(
          (device) => !nextDevices.some((nextDevice) => nextDevice.deviceId === device.deviceId)
        )
      : [];

  const shouldRevokeAllSessions = active === false || accountLocked === true;

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id },
      data: {
        email,
        name,
        role,
        clientId,
        ...(active !== undefined && { active }),
        ...(accountLocked !== undefined && { accountLocked }),
        ...(allowedIpAddresses !== undefined && {
          allowedIpAddresses: sanitizeAllowedIpAddresses(allowedIpAddresses),
        }),
        ...(registeredDevices !== undefined && {
          registeredDevices: toRegisteredDevicesJson(nextDevices),
        }),
      },
      include: {
        client: true,
      },
    });

    if (shouldRevokeAllSessions) {
      await tx.userSession.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else if (removedDevices.length > 0) {
      await tx.userSession.updateMany({
        where: {
          userId: id,
          revokedAt: null,
          OR: removedDevices.map((device) => ({ deviceId: device.deviceId })),
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return updatedUser;
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

export const revokeUserDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { deviceId, label, ipAddress } = req.body as DeviceTarget;

  const target: DeviceTarget = {
    deviceId: deviceId || null,
    label: label || null,
    ipAddress: ipAddress || null,
  };

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  const existingDevices = normalizeRegisteredDevices(user.registeredDevices);
  const matchedDevice = existingDevices.find((device) => matchesDevice(device, target));

  if (!matchedDevice) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  const { devices } = removeRegisteredDevice(user.registeredDevices, {
    deviceId: matchedDevice.deviceId,
    label: matchedDevice.label,
    ipAddress: matchedDevice.ipAddress,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        registeredDevices: toRegisteredDevicesJson(devices),
      },
    }),
    prisma.userSession.updateMany({
      where: {
        userId: id,
        revokedAt: null,
        OR: [
          { deviceId: matchedDevice.deviceId },
          ...(matchedDevice.ipAddress
            ? [{ deviceLabel: matchedDevice.label, ipAddress: matchedDevice.ipAddress }]
            : [{ deviceLabel: matchedDevice.label }]),
        ],
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  res.json({
    success: true,
    message: "Device revoked successfully",
  });
};
