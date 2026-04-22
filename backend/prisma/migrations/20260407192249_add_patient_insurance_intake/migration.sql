-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('PRIMARY', 'SECONDARY', 'TERTIARY');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "ssn" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL DEFAULT 'PRIMARY',
    "payerId" TEXT,
    "payerName" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupNumber" TEXT,
    "subscriberName" TEXT,
    "subscriberDob" TIMESTAMP(3),
    "subscriberRelationship" TEXT,
    "planName" TEXT,
    "planType" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "rxBin" TEXT,
    "rxPcn" TEXT,
    "rxGroup" TEXT,
    "copayPcp" DOUBLE PRECISION,
    "copaySpecialist" DOUBLE PRECISION,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastCoverageStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCardUpload" (
    "id" TEXT NOT NULL,
    "policyId" TEXT,
    "patientId" TEXT,
    "clientId" TEXT NOT NULL,
    "cardSide" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageBucket" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "extractedData" JSONB,
    "confidenceScores" JSONB,
    "overallConfidence" INTEGER,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "uploadedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceCardUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_clientId_idx" ON "Patient"("clientId");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_deletedAt_idx" ON "Patient"("deletedAt");

-- CreateIndex
CREATE INDEX "InsurancePolicy_patientId_idx" ON "InsurancePolicy"("patientId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_memberId_idx" ON "InsurancePolicy"("memberId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_deletedAt_idx" ON "InsurancePolicy"("deletedAt");

-- CreateIndex
CREATE INDEX "InsuranceCardUpload_policyId_idx" ON "InsuranceCardUpload"("policyId");

-- CreateIndex
CREATE INDEX "InsuranceCardUpload_patientId_idx" ON "InsuranceCardUpload"("patientId");

-- CreateIndex
CREATE INDEX "InsuranceCardUpload_clientId_idx" ON "InsuranceCardUpload"("clientId");

-- CreateIndex
CREATE INDEX "InsuranceCardUpload_expiresAt_idx" ON "InsuranceCardUpload"("expiresAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCardUpload" ADD CONSTRAINT "InsuranceCardUpload_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
