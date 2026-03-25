import type { Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
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
      message: "An account with this email already exists",
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

  // Generate JWT token
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
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
      message: "Invalid email or password",
    });
    return;
  }

  // Verify password
  if (!user.passwordHash) {
    res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
    return;
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
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
      message: "User not found",
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
  _req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  // With JWT, logout is handled client-side by removing the token
  // Optionally implement token blacklisting here
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};
