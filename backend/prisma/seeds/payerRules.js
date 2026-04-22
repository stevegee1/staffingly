/**
 * seeds/payerRules.js
 * Seeds payer rules for major insurance payers
 */

const PAYER_RULES = [
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

export async function seedPayerRules(prisma) {
  for (const rule of PAYER_RULES) {
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
}
