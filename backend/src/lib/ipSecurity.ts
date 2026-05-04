import net from "node:net";
import type { Request } from "express";

function stripPort(rawValue: string): string {
  const value = rawValue.trim();

  if (value.startsWith("[") && value.includes("]")) {
    return value.slice(1, value.indexOf("]"));
  }

  if (value.includes(".") && value.includes(":")) {
    const [host] = value.split(":");
    return host || value;
  }

  return value;
}

export function normalizeIp(rawValue: string | null | undefined): string | null {
  if (!rawValue) return null;

  const withoutPort = stripPort(rawValue).split("%")[0]?.trim();
  if (!withoutPort) return null;

  if (withoutPort === "::1") return "127.0.0.1";
  if (withoutPort.startsWith("::ffff:")) return withoutPort.slice(7);

  return withoutPort;
}

export function getRequestIp(req: Request): string | null {
  const forwardedForHeader = req.headers["x-forwarded-for"];
  const forwardedFor = Array.isArray(forwardedForHeader)
    ? forwardedForHeader[0]
    : forwardedForHeader;

  const forwardedIp = forwardedFor?.split(",")[0];
  const candidateIp = forwardedIp || req.ip || req.socket.remoteAddress || null;

  return normalizeIp(candidateIp);
}

export function sanitizeAllowedIpAddresses(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .filter((value, index, collection) => collection.indexOf(value) === index);
}

function isValidSubnetPrefix(prefix: number, ipVersion: number): boolean {
  if (Number.isNaN(prefix)) return false;
  return ipVersion === 4 ? prefix >= 0 && prefix <= 32 : prefix >= 0 && prefix <= 128;
}

export function isIpAllowed(ip: string | null, allowedEntries: string[] | null | undefined): boolean {
  if (!allowedEntries || allowedEntries.length === 0) return true;
  if (!ip) return false;

  return allowedEntries.some((entry) => {
    const value = entry.trim();
    if (!value) return false;

    if (!value.includes("/")) {
      return normalizeIp(value) === ip;
    }

    const [rangeIp, prefixText] = value.split("/");
    const normalizedRangeIp = normalizeIp(rangeIp);
    if (!normalizedRangeIp || !prefixText) return false;

    const ipVersion = net.isIP(normalizedRangeIp);
    const prefix = Number.parseInt(prefixText, 10);
    if (!ipVersion || !isValidSubnetPrefix(prefix, ipVersion)) return false;

    const blockList = new net.BlockList();
    blockList.addSubnet(normalizedRangeIp, prefix, ipVersion === 4 ? "ipv4" : "ipv6");

    return blockList.check(ip, ipVersion === 4 ? "ipv4" : "ipv6");
  });
}

export function getIpRestrictionError(
  req: Request,
  allowedEntries: string[] | null | undefined
): string | null {
  const sanitizedEntries = sanitizeAllowedIpAddresses(allowedEntries);
  if (sanitizedEntries.length === 0) return null;

  const ip = getRequestIp(req);
  if (isIpAllowed(ip, sanitizedEntries)) return null;

  return "Your account is restricted to approved IP addresses. Contact an administrator.";
}
