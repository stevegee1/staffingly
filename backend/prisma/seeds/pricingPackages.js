/**
 * seeds/pricingPackages.js
 * Seeds pricing packages
 */

export async function seedPricingPackages(prisma) {
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
  return { proPackage };
}
