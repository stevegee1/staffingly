-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FINANCE_ADMIN', 'STAFFINGLY_ADMIN', 'STAFFINGLY_SUPERVISOR', 'STAFFINGLY_SPECIALIST', 'CLIENT_USER');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DISPUTE_WINDOW', 'PENDING', 'PAID', 'PAYMENT_FAILED', 'DISPUTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CaseUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EXPEDITED');

-- CreateEnum
CREATE TYPE "PriorAuthStatus" AS ENUM ('INTAKE', 'PENDING_DOCUMENTS', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'APPROVED', 'DENIED', 'APPEAL_IN_PROGRESS', 'PEER_TO_PEER_REQUESTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AutomationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('STAFFINGLY_PORTAL', 'GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT_USER',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "practiceName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "billingContactName" TEXT,
    "billingContactEmail" TEXT,
    "pricingPackageId" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disputeWindowHours" INTEGER NOT NULL DEFAULT 24,
    "billingPaused" BOOLEAN NOT NULL DEFAULT false,
    "accountFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyBaseFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerEligibilityCheck" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerPriorAuth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerApprovedPriorAuth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerAppeal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includedEligibilityChecks" INTEGER NOT NULL DEFAULT 0,
    "includedPriorAuths" INTEGER NOT NULL DEFAULT 0,
    "includedAppeals" INTEGER NOT NULL DEFAULT 0,
    "unlimitedEligibility" BOOLEAN NOT NULL DEFAULT false,
    "unlimitedPriorAuths" BOOLEAN NOT NULL DEFAULT false,
    "unlimitedAppeals" BOOLEAN NOT NULL DEFAULT false,
    "chargeOnApproval" BOOLEAN NOT NULL DEFAULT false,
    "overageRateEligibility" DOUBLE PRECISION,
    "overageRatePriorAuth" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "lineItemsJson" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditsApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DISPUTE_WINDOW',
    "disputeWindowOpensAt" TIMESTAMP(3),
    "disputeWindowClosesAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentFailedAt" TIMESTAMP(3),
    "stripePaymentIntentId" TEXT,
    "stripeErrorCode" TEXT,
    "stripeErrorMessage" TEXT,
    "retryScheduledAt" TIMESTAMP(3),
    "pricingPackageName" TEXT,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCredit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "appliedToInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAuditLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "invoiceId" TEXT,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCheck" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientDob" TIMESTAMP(3),
    "memberId" TEXT,
    "payerId" TEXT,
    "payerName" TEXT,
    "providerNpi" TEXT,
    "serviceTypeCode" TEXT,
    "serviceDate" TIMESTAMP(3),
    "coverageStatus" "CoverageStatus",
    "planName" TEXT,
    "planType" TEXT,
    "networkStatus" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "groupNumber" TEXT,
    "benefitsRaw" TEXT,
    "confidenceScore" INTEGER,
    "responseTimeSeconds" DOUBLE PRECISION,
    "channelUsed" TEXT,
    "flags" TEXT[],
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "rawResponse" TEXT,
    "errorMessage" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorAuthCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "patientName" TEXT,
    "patientInitials" TEXT,
    "patientDob" TIMESTAMP(3),
    "insuranceId" TEXT,
    "payerName" TEXT,
    "payerId" TEXT,
    "serviceType" TEXT,
    "diagnosisCodes" TEXT[],
    "procedureCodes" TEXT[],
    "requestingProvider" TEXT,
    "requestingProviderNpi" TEXT,
    "urgency" "CaseUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "PriorAuthStatus" NOT NULL DEFAULT 'INTAKE',
    "assignedSpecialistId" TEXT,
    "eligibilityVerified" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityCheckId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "denialReason" TEXT,
    "appealSubmittedAt" TIMESTAMP(3),
    "authorizationNumber" TEXT,
    "authValidFrom" TIMESTAMP(3),
    "authValidTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorAuthCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorAuthDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "checklistItemKey" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "aiClassification" TEXT,
    "aiExtractedDataJson" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorAuthDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerRule" (
    "id" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerId" TEXT,
    "serviceType" TEXT,
    "requiresPriorAuth" BOOLEAN NOT NULL DEFAULT true,
    "submissionMethod" TEXT,
    "portalUrl" TEXT,
    "phoneNumber" TEXT,
    "faxNumber" TEXT,
    "turnaroundDays" INTEGER,
    "requiredDocuments" TEXT[],
    "automationSupported" BOOLEAN NOT NULL DEFAULT false,
    "fieldMappingJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayerRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "clientId" TEXT,
    "caseId" TEXT,
    "payerName" TEXT NOT NULL,
    "urgency" "CaseUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "queuePosition" INTEGER,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "resultJson" TEXT,
    "confirmationNumber" TEXT,
    "screenshotUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientStorageConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT,
    "storageType" "StorageType" NOT NULL DEFAULT 'STAFFINGLY_PORTAL',
    "credentialKeyRef" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "folderStructureCreated" BOOLEAN NOT NULL DEFAULT false,
    "rootFolderId" TEXT,
    "incomingFolderId" TEXT,
    "processedFolderId" TEXT,
    "archiveFolderId" TEXT,
    "reportsFolderId" TEXT,
    "connectionVerified" BOOLEAN NOT NULL DEFAULT false,
    "connectionVerifiedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientStorageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageType" TEXT,
    "detectedDocumentType" TEXT,
    "aiClassificationConfidence" DOUBLE PRECISION,
    "extractedPatientInitials" TEXT,
    "extractedDob" TIMESTAMP(3),
    "extractedInsuranceId" TEXT,
    "extractedDiagnosisCodes" TEXT[],
    "extractedPhysician" TEXT,
    "extractedDataJson" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "suggestedCaseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Unmatched',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnmatchedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveSyncLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT,
    "storageType" TEXT,
    "syncStartedAt" TIMESTAMP(3) NOT NULL,
    "syncCompletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "filesDetected" INTEGER NOT NULL DEFAULT 0,
    "filesMatched" INTEGER NOT NULL DEFAULT 0,
    "filesUnmatched" INTEGER NOT NULL DEFAULT 0,
    "filesErrored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriveSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedInvoiceId" TEXT,
    "relatedCaseId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "dob" TEXT,
    "memberId" TEXT,
    "payer" TEXT,
    "payerId" TEXT,
    "planType" TEXT,
    "groupNumber" TEXT,
    "lastCoverageStatus" TEXT,
    "lastVerifiedDate" TEXT,
    "lastConfidenceScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "npi" TEXT,
    "specialty" TEXT,
    "taxonomy" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messagesJson" TEXT NOT NULL,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityHistory" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "clientId" TEXT,
    "providerId" TEXT,
    "subscriberName" TEXT,
    "payer" TEXT,
    "memberId" TEXT,
    "providerNpi" TEXT,
    "serviceDate" TEXT,
    "coverageStatus" TEXT,
    "planName" TEXT,
    "planType" TEXT,
    "networkStatus" TEXT,
    "effectiveDate" TEXT,
    "terminationDate" TEXT,
    "deductibleIndividualTotal" DOUBLE PRECISION,
    "deductibleIndividualMet" DOUBLE PRECISION,
    "oopMaxIndividual" DOUBLE PRECISION,
    "copayPcp" DOUBLE PRECISION,
    "copaySpecialist" DOUBLE PRECISION,
    "coinsuranceIn" DOUBLE PRECISION,
    "confidenceScore" INTEGER,
    "flagsJson" TEXT,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "rawResponseJson" TEXT,
    "channelUsed" TEXT,
    "responseTimeSeconds" DOUBLE PRECISION,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientBranding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "companyName" TEXT,
    "welcomeMessage" TEXT,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "clientId" TEXT,
    "senderId" TEXT,
    "senderName" TEXT,
    "senderRole" TEXT,
    "message" TEXT NOT NULL,
    "readByClient" BOOLEAN NOT NULL DEFAULT false,
    "readByStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ratePerCase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payPeriodStart" TEXT NOT NULL,
    "payPeriodEnd" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivityLog" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "casesWorked" INTEGER NOT NULL DEFAULT 0,
    "casesApproved" INTEGER NOT NULL DEFAULT 0,
    "casesDenied" INTEGER NOT NULL DEFAULT 0,
    "hoursLogged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffinglyAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffinglyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_clientId_key" ON "BillingProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PriorAuthCase_caseNumber_key" ON "PriorAuthCase"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationJob_jobId_key" ON "AutomationJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientStorageConfig_clientId_key" ON "ClientStorageConfig"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientBranding_clientId_key" ON "ClientBranding"("clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_pricingPackageId_fkey" FOREIGN KEY ("pricingPackageId") REFERENCES "PricingPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCredit" ADD CONSTRAINT "BillingCredit_appliedToInvoiceId_fkey" FOREIGN KEY ("appliedToInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityCheck" ADD CONSTRAINT "EligibilityCheck_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityCheck" ADD CONSTRAINT "EligibilityCheck_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthCase" ADD CONSTRAINT "PriorAuthCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthCase" ADD CONSTRAINT "PriorAuthCase_assignedSpecialistId_fkey" FOREIGN KEY ("assignedSpecialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthDocument" ADD CONSTRAINT "PriorAuthDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PriorAuthCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStorageConfig" ADD CONSTRAINT "ClientStorageConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedDocument" ADD CONSTRAINT "UnmatchedDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveSyncLog" ADD CONSTRAINT "DriveSyncLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
