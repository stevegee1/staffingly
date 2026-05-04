import type { Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import {
  getRequestDeviceId,
  parseJwtExpiry,
  toRegisteredDevicesJson,
  upsertRegisteredDevice,
} from "../lib/deviceSessions.js";
import { getIpRestrictionError, getRequestIp } from "../lib/ipSecurity.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import type {
  AuthenticatedRequest,
  ApiResponse,
  JwtPayload,
  UserWithClient,
} from "../types/index.js";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

interface LoginRequestBody {
  email: string;
  password: string;
}

interface LoginResponseData {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    clientId: string | null;
    client: UserWithClient["client"];
  };
}

interface UserResponseData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  clientId: string | null;
  client: UserWithClient["client"];
}

interface RegisterRequestBody {
  email: string;
  password: string;
  name?: string;
}

export const register = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<LoginResponseData>>
): Promise<void> => {
  const { email, password, name } = req.body as RegisterRequestBody;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message:
        "An account with this email already exists. Please sign in instead or use a different email.",
    });
    return;
  }

  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || email.split("@")[0],
      role: "CLIENT_USER",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  const registrationIp = getRequestIp(req);
  const registrationUserAgentHeader = req.headers["user-agent"];
  const registrationUserAgent = Array.isArray(registrationUserAgentHeader)
    ? registrationUserAgentHeader[0]
    : registrationUserAgentHeader;
  const deviceId = getRequestDeviceId(req);
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      deviceId,
      deviceLabel: registrationUserAgent || "Unknown device",
      ipAddress: registrationIp,
      userAgent: registrationUserAgent,
      expiresAt: parseJwtExpiry(JWT_EXPIRES_IN),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      registeredDevices: toRegisteredDevicesJson(
        upsertRegisteredDevice(user.registeredDevices, {
          deviceId,
          userAgent: registrationUserAgent,
          ipAddress: registrationIp,
        })
      ),
    },
  });

  // Generate JWT token
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    sessionId: session.id,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId,
        client: user.client,
      },
    },
  });
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<LoginResponseData>>
): Promise<void> => {
  const { email, password } = req.body as LoginRequestBody;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    res.status(401).json({
      success: false,
      message: "No account found with this email. Please check your email or create a new account.",
    });
    return;
  }

  if (user.active === false) {
    res.status(403).json({
      success: false,
      message: "Your account has been deactivated. Contact an administrator.",
    });
    return;
  }

  if (user.accountLocked) {
    res.status(403).json({
      success: false,
      message: "Your account has been locked. Contact an administrator.",
    });
    return;
  }

  const ipRestrictionError = getIpRestrictionError(req, user.allowedIpAddresses);
  if (ipRestrictionError) {
    res.status(403).json({
      success: false,
      message: ipRestrictionError,
    });
    return;
  }

  // Users without passwords cannot sign in through the UI.
  if (!user.passwordHash) {
    res.status(401).json({
      success: false,
      message: "Password sign-in is not available for this account. Contact an administrator.",
    });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      message: "The email or password you entered is incorrect. Please try again.",
    });
    return;
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    sessionId: "",
  };
  const loginIp = getRequestIp(req);
  const userAgent = req.headers["user-agent"];
  const normalizedUserAgent = Array.isArray(userAgent) ? userAgent[0] : userAgent;
  const deviceId = getRequestDeviceId(req);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      deviceId,
      deviceLabel: normalizedUserAgent || "Unknown device",
      ipAddress: loginIp,
      userAgent: normalizedUserAgent,
      expiresAt: parseJwtExpiry(JWT_EXPIRES_IN),
    },
  });

  payload.sessionId = session.id;

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      registeredDevices: toRegisteredDevicesJson(
        upsertRegisteredDevice(user.registeredDevices, {
          deviceId,
          userAgent: normalizedUserAgent,
          ipAddress: loginIp,
        })
      ),
    },
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId,
        client: user.client,
      },
    },
  });
};

export const me = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<UserResponseData>>
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "Your session has expired. Please sign in again.",
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      client: user.client,
    },
  });
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  if (req.user?.sessionId) {
    await prisma.userSession.updateMany({
      where: {
        id: req.user.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

interface ForgotPasswordRequestBody {
  email: string;
}

export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const { email } = req.body as ForgotPasswordRequestBody;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link shortly.",
    });
    return;
  }

  // Check if user signed up with Google (no password)
  if (!user.passwordHash && user.googleId) {
    res.json({
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link shortly.",
    });
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    },
  });

  // Send reset email
  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    // Don't expose email sending failures to the user
  }

  res.json({
    success: true,
    message:
      "If an account exists with this email, you will receive a password reset link shortly.",
  });
};

interface ResetPasswordRequestBody {
  token: string;
  newPassword: string;
}

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const { token, newPassword } = req.body as ResetPasswordRequestBody;

  if (!token || !newPassword) {
    res.status(400).json({
      success: false,
      message: "Reset token and new password are required.",
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters.",
    });
    return;
  }

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    res.status(400).json({
      success: false,
      message: "This password reset link has expired or is invalid. Please request a new one.",
    });
    return;
  }

  // Hash new password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  res.json({
    success: true,
    message:
      "Your password has been reset successfully. You can now sign in with your new password.",
  });
};
