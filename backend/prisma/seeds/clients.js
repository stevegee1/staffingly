/**
 * seeds/clients.js
 * Seeds demo client with billing profile, storage config, and client user
 */

export async function seedClients(prisma, { proPackage }) {
  const seededClients = [
    {
      id: "client-sunrise-family-clinic",
      name: "Dr. Maria Lopez",
      practiceName: "Sunrise Family Clinic",
      contactEmail: "maria@sunrise.com",
      status: "ACTIVE",
      onboardedAt: new Date("2025-06-10"),
    },
    {
      id: "client-lakeview-orthopedics",
      name: "Dr. James Park",
      practiceName: "Lakeview Orthopedics",
      contactEmail: "james@lakeview.com",
      status: "ACTIVE",
      onboardedAt: new Date("2025-08-22"),
    },
    {
      id: "client-metro-mental-health-associates",
      name: "Dr. Aisha Rahman",
      practiceName: "Metro Mental Health Associates",
      contactEmail: "aisha@metro-mh.com",
      status: "INACTIVE",
      onboardedAt: new Date("2025-03-01"),
    },
  ];

  for (const client of seededClients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {
        name: client.name,
        practiceName: client.practiceName,
        contactEmail: client.contactEmail,
        status: client.status,
        onboardedAt: client.onboardedAt,
      },
      create: client,
    });
  }

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

  console.log("✅ Created seeded clients, including demo client with billing and storage config");
}
