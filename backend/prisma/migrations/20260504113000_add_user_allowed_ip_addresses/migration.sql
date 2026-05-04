-- AlterTable
ALTER TABLE "User"
ADD COLUMN "allowedIpAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[];
