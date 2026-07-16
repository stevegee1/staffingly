-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "emrConfigJson" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "registeredDevices" JSONB;

-- CreateTable
CREATE TABLE "SystemSecuritySettings" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'global',
    "sessionTimeoutHours" INTEGER NOT NULL DEFAULT 8,
    "otpExpiryMinutes" INTEGER NOT NULL DEFAULT 5,
    "lockoutThreshold" INTEGER NOT NULL DEFAULT 5,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "concurrentSessions" INTEGER NOT NULL DEFAULT 2,
    "countryBlocking" BOOLEAN NOT NULL DEFAULT true,
    "approvedCountries" TEXT[] DEFAULT ARRAY['US', 'IN', 'PK', 'BD']::TEXT[],
    "alertRecipientsJson" TEXT,
    "twoFactorConfigJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSecuritySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterImport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSecuritySettings_singletonKey_key" ON "SystemSecuritySettings"("singletonKey");

-- CreateIndex
CREATE INDEX "RosterImport_clientId_idx" ON "RosterImport"("clientId");

-- CreateIndex
CREATE INDEX "RosterImport_uploadedById_idx" ON "RosterImport"("uploadedById");

-- CreateIndex
CREATE INDEX "RosterImport_createdAt_idx" ON "RosterImport"("createdAt");

-- AddForeignKey
ALTER TABLE "RosterImport" ADD CONSTRAINT "RosterImport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterImport" ADD CONSTRAINT "RosterImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
