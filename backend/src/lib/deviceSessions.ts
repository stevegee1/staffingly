import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";

export interface RegisteredDeviceRecord {
  deviceId: string;
  label: string;
  added: string;
  lastSeenAt?: string;
  ipAddress?: string;
}

export interface DeviceTarget {
  deviceId?: string | null;
  label?: string | null;
  ipAddress?: string | null;
}

export function getRequestDeviceId(req: Request): string {
  const rawHeader = req.headers["x-device-id"];
  const deviceId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const normalized = typeof deviceId === "string" ? deviceId.trim() : "";

  return normalized || crypto.randomUUID();
}

export function buildDeviceLabel(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown device";
  if (userAgent.includes("Windows")) return "Windows device";
  if (userAgent.includes("Mac OS X")) return "Mac device";
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android device";
  if (userAgent.includes("Linux")) return "Linux device";

  return "Browser device";
}

export function normalizeRegisteredDevices(existingDevices: unknown): RegisteredDeviceRecord[] {
  if (!Array.isArray(existingDevices)) return [];

  return existingDevices.reduce<RegisteredDeviceRecord[]>((collection, item) => {
    if (!item || typeof item !== "object") return collection;

    const candidate = item as Partial<RegisteredDeviceRecord>;
    if (typeof candidate.label !== "string" || typeof candidate.added !== "string") {
      return collection;
    }

    collection.push({
      deviceId:
        typeof candidate.deviceId === "string" && candidate.deviceId.trim()
          ? candidate.deviceId.trim()
          : crypto.randomUUID(),
      label: candidate.label,
      added: candidate.added,
      lastSeenAt: typeof candidate.lastSeenAt === "string" ? candidate.lastSeenAt : undefined,
      ipAddress: typeof candidate.ipAddress === "string" ? candidate.ipAddress : undefined,
    });
    return collection;
  }, []);
}

export function upsertRegisteredDevice(
  existingDevices: unknown,
  options: {
    deviceId: string;
    userAgent: string | undefined;
    ipAddress: string | null;
  }
): RegisteredDeviceRecord[] {
  const devices = normalizeRegisteredDevices(existingDevices);
  const deviceLabel = buildDeviceLabel(options.userAgent);
  const now = new Date().toISOString();
  const matchingIndex = devices.findIndex((device) => device.deviceId === options.deviceId);

  if (matchingIndex >= 0) {
    const updated = [...devices];
    const currentDevice = updated[matchingIndex];
    if (!currentDevice) return devices;

    updated[matchingIndex] = {
      ...currentDevice,
      label: currentDevice.label || deviceLabel,
      ipAddress: options.ipAddress || currentDevice.ipAddress,
      lastSeenAt: now,
    };
    return updated;
  }

  return [
    {
      deviceId: options.deviceId,
      label: deviceLabel,
      added: now,
      lastSeenAt: now,
      ipAddress: options.ipAddress || undefined,
    },
    ...devices,
  ].slice(0, 10);
}

export function matchesDevice(device: RegisteredDeviceRecord, target: DeviceTarget): boolean {
  if (target.deviceId && device.deviceId === target.deviceId) return true;
  if (target.label && target.ipAddress) {
    return device.label === target.label && device.ipAddress === target.ipAddress;
  }
  if (target.label && device.label === target.label) return true;
  if (target.ipAddress && device.ipAddress === target.ipAddress) return true;
  return false;
}

export function removeRegisteredDevice(
  existingDevices: unknown,
  target: DeviceTarget
): { devices: RegisteredDeviceRecord[]; removed: RegisteredDeviceRecord[] } {
  const devices = normalizeRegisteredDevices(existingDevices);
  const removed = devices.filter((device) => matchesDevice(device, target));
  const remaining = devices.filter((device) => !matchesDevice(device, target));

  return { devices: remaining, removed };
}

export function toRegisteredDevicesJson(devices: RegisteredDeviceRecord[]): Prisma.InputJsonValue {
  return devices as unknown as Prisma.InputJsonValue;
}

export function parseJwtExpiry(expiresIn: string): Date | null {
  const normalized = expiresIn.trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return new Date(Date.now() + Number.parseInt(normalized, 10) * 1000);
  }

  const match = normalized.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const amount = Number.parseInt(match[1] || "0", 10);
  const unit = (match[2] || "").toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  } as const;
  const multiplier = multipliers[unit as keyof typeof multipliers];

  return multiplier ? new Date(Date.now() + amount * multiplier) : null;
}
