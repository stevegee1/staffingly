/**
 * seed.js - Seed the database with initial data
 * Run with: npx prisma db seed
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.pricingPackage.upsert({
    where: { id: "pkg-basic" },
    update: {},
    create: {
      id: "pkg-basic",
      name: "Basic",
      description: "For small practices with low volume",
      monthlyBaseFee: 99,
      ratePerEligibilityCheck: 0.5,
      ratePerPriorAuth: 15,
      ratePerAppeal: 25,
      includedEligibilityChecks: 100,
      includedPriorAuths: 10,
      includedAppeals: 2,
    },
  });

  const proPackage = await prisma.pricingPackage.upsert({
    where: { id: "pkg-pro" },
    update: {},
    create: {
      id: "pkg-pro",
      name: "Professional",
      description: "For growing practices with moderate volume",
      monthlyBaseFee: 299,
      ratePerEligibilityCheck: 0.35,
      ratePerPriorAuth: 12,
      ratePerApprovedPriorAuth: 5,
      ratePerAppeal: 20,
      includedEligibilityChecks: 500,
      includedPriorAuths: 50,
      includedAppeals: 10,
      chargeOnApproval: true,
    },
  });

  await prisma.pricingPackage.upsert({
    where: { id: "pkg-enterprise" },
    update: {},
    create: {
      id: "pkg-enterprise",
      name: "Enterprise",
      description: "For large practices with high volume",
      monthlyBaseFee: 999,
      unlimitedEligibility: true,
      unlimitedPriorAuths: true,
      unlimitedAppeals: true,
      ratePerApprovedPriorAuth: 3,
      chargeOnApproval: true,
    },
  });

  console.log("✅ Created pricing packages");

  await prisma.user.upsert({
    where: { email: "admin@staffverify.com" },
    update: {},
    create: {
      email: "admin@staffverify.com",
      name: "System Admin",
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "finance@staffverify.com" },
    update: {},
    create: {
      email: "finance@staffverify.com",
      name: "Finance Admin",
      role: "FINANCE_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "supervisor@staffverify.com" },
    update: {},
    create: {
      email: "supervisor@staffverify.com",
      name: "Team Supervisor",
      role: "STAFFINGLY_SUPERVISOR",
    },
  });

  await prisma.user.upsert({
    where: { email: "specialist@staffverify.com" },
    update: {},
    create: {
      email: "specialist@staffverify.com",
      name: "Auth Specialist",
      role: "STAFFINGLY_SPECIALIST",
    },
  });

  console.log("✅ Created sample users");

  await prisma.client.upsert({
    where: { id: "client-demo" },
    update: {},
    create: {
      id: "client-demo",
      name: "Demo Medical Practice",
      practiceName: "Demo Family Medicine",
      contactEmail: "contact@demopractice.com",
      contactPhone: "(555) 123-4567",
      status: "ACTIVE",
      onboardedAt: new Date(),
    },
  });

  // Create billing profile for demo client
  await prisma.billingProfile.upsert({
    where: { clientId: "client-demo" },
    update: {},
    create: {
      clientId: "client-demo",
      pricingPackageId: proPackage.id,
      billingContactName: "Jane Doe",
      billingContactEmail: "billing@demopractice.com",
      disputeWindowHours: 24,
    },
  });

  // Create storage config for demo client
  await prisma.clientStorageConfig.upsert({
    where: { clientId: "client-demo" },
    update: {},
    create: {
      clientId: "client-demo",
      clientName: "Demo Medical Practice",
      storageType: "STAFFINGLY_PORTAL",
      syncEnabled: true,
      folderStructureCreated: true,
      rootFolderId: "portal:client-demo",
      incomingFolderId: "portal:client-demo:incoming",
      processedFolderId: "portal:client-demo:processed",
      archiveFolderId: "portal:client-demo:archive",
      reportsFolderId: "portal:client-demo:reports",
    },
  });

  // Create client user
  await prisma.user.upsert({
    where: { email: "user@demopractice.com" },
    update: {},
    create: {
      email: "user@demopractice.com",
      name: "Demo User",
      role: "CLIENT_USER",
      clientId: "client-demo",
    },
  });

  console.log("✅ Created demo client with billing and storage config");

  // Create sample payer rules
  const payerRules = [
    {
      payerName: "Aetna",
      payerId: "60054",
      submissionMethod: "Portal",
      portalUrl: "https://provider.aetna.com",
      turnaroundDays: 14,
      requiredDocuments: ["Clinical Notes", "Letter of Medical Necessity"],
      automationSupported: true,
    },
    {
      payerName: "UnitedHealthcare",
      payerId: "87726",
      submissionMethod: "Portal",
      portalUrl: "https://provider.uhc.com",
      turnaroundDays: 15,
      requiredDocuments: ["Clinical Notes", "Lab Results", "Prior Treatment Records"],
      automationSupported: true,
    },
    {
      payerName: "Blue Cross Blue Shield",
      payerId: "BCBS",
      submissionMethod: "Fax",
      faxNumber: "1-800-555-0199",
      turnaroundDays: 10,
      requiredDocuments: ["Clinical Notes", "Letter of Medical Necessity", "Physician Order"],
      automationSupported: false,
    },
    {
      payerName: "Cigna",
      payerId: "62308",
      submissionMethod: "Portal",
      portalUrl: "https://cignaforhcp.com",
      turnaroundDays: 14,
      requiredDocuments: ["Clinical Notes"],
      automationSupported: true,
    },
    {
      payerName: "Humana",
      payerId: "61101",
      submissionMethod: "Phone",
      phoneNumber: "1-800-555-0123",
      turnaroundDays: 7,
      requiredDocuments: ["Clinical Notes", "Lab Results"],
      automationSupported: false,
    },
  ];

  for (const rule of payerRules) {
    await prisma.payerRule.upsert({
      where: { id: `rule-${rule.payerId}` },
      update: rule,
      create: {
        id: `rule-${rule.payerId}`,
        ...rule,
      },
    });
  }

  console.log("✅ Created payer rules");

  // Keep legacy staff data for backwards compatibility
  await prisma.staff.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      name: "John Doe",
      email: "john@example.com",
      department: "Engineering",
      verified: true,
    },
  });

  await prisma.staff.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      name: "Jane Smith",
      email: "jane@example.com",
      department: "HR",
      verified: false,
    },
  });

  await prisma.staff.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob Johnson",
      email: "bob@example.com",
      department: "Finance",
      verified: true,
    },
  });

  console.log("✅ Created legacy staff records");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
