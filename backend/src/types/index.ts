import type { Request } from "express";
import type { User, Client } from "@prisma/client";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  clientId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  offset?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type UserWithClient = User & {
  client: Pick<Client, "id" | "name" | "status"> | null;
};

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  clientId: string | null;
}
