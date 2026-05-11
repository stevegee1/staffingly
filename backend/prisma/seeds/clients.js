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
      contactName: "Maria Lopez",
      contactEmail: "maria@sunrise.com",
      contactPhone: "(555) 201-4401",
      address: "7801 Sunrise Valley Drive, Austin, TX 78729",
      npi: "1760421357",
      taxId: "74-3812450",
      subdomain: "sunrise-family",
      status: "ACTIVE",
      onboardedAt: new Date("2025-06-10"),
    },
    {
      id: "client-lakeview-orthopedics",
      name: "Dr. James Park",
      practiceName: "Lakeview Orthopedics",
      contactName: "James Park",
      contactEmail: "james@lakeview.com",
      contactPhone: "(555) 201-4402",
      address: "1240 Lakeview Parkway, Austin, TX 78757",
      npi: "1881762094",
      taxId: "74-4921567",
      subdomain: "lakeview-ortho",
      status: "ACTIVE",
      onboardedAt: new Date("2025-08-22"),
    },
    {
      id: "client-metro-mental-health-associates",
      name: "Dr. Aisha Rahman",
      practiceName: "Metro Mental Health Associates",
      contactName: "Aisha Rahman",
      contactEmail: "aisha@metro-mh.com",
      contactPhone: "(555) 201-4403",
      address: "455 Metro Center Boulevard, Austin, TX 78704",
      npi: "1992846711",
      taxId: "74-5032981",
      subdomain: "metro-mental-health",
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
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        address: client.address,
        npi: client.npi,
        taxId: client.taxId,
        subdomain: client.subdomain,
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
      contactName: "Amanda Chen",
      contactEmail: "contact@demopractice.com",
      contactPhone: "(555) 123-4567",
      address: "100 Demo Plaza, Austin, TX 78701",
      npi: "1234567890",
      taxId: "74-1002003",
      subdomain: "demo-family-medicine",
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
