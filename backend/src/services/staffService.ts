/**
 * staffService.ts - Business logic for staff verification (Prisma)
 */
import prisma from "../lib/prisma.js";
import type { Staff } from "@prisma/client";

export const getAllStaff = async (): Promise<Staff[]> => {
  return await prisma.staff.findMany();
};

export const getStaffById = async (id: string): Promise<Staff | null> => {
  return await prisma.staff.findUnique({ where: { id: parseInt(id) } });
};

export const verifyStaff = async (id: string): Promise<Staff | null> => {
  const staff = await prisma.staff.findUnique({ where: { id: parseInt(id) } });
  if (!staff) return null;
  return await prisma.staff.update({
    where: { id: parseInt(id) },
    data: { verified: true },
  });
};
