const SUBSCRIBERS = [
  {
    id: "subscriber-sarah-mitchell",
    clientId: "client-demo",
    firstName: "Sarah",
    lastName: "Mitchell",
    dob: "03/14/1985",
    memberId: "UHC-884720193",
    payer: "UnitedHealthcare",
    payerId: "87726",
    planType: "PPO",
    groupNumber: "GRP-44821",
    lastCoverageStatus: "Active",
    lastVerifiedDate: "2026-03-01",
    lastConfidenceScore: 94,
  },
  {
    id: "subscriber-samuel-mitchell",
    clientId: "client-demo",
    firstName: "Samuel",
    lastName: "Mitchell",
    dob: "09/20/1978",
    memberId: "CIG-338881234",
    payer: "Cigna",
    payerId: "62308",
    planType: "HMO",
    groupNumber: "GRP-77001",
    lastCoverageStatus: "Unknown",
    lastVerifiedDate: "2026-02-27",
    lastConfidenceScore: 71,
  },
  {
    id: "subscriber-james-holloway",
    clientId: "client-demo",
    firstName: "James",
    lastName: "Holloway",
    dob: "07/22/1971",
    memberId: "AETNA-562901847",
    payer: "Aetna",
    payerId: "60054",
    planType: "HMO",
    groupNumber: "GRP-77334",
    lastCoverageStatus: "Active",
    lastVerifiedDate: "2026-03-01",
    lastConfidenceScore: 91,
  },
  {
    id: "subscriber-linda-patel",
    clientId: "client-demo",
    firstName: "Linda",
    lastName: "Patel",
    dob: "11/30/1990",
    memberId: "BCBS-774930281",
    payer: "Blue Cross Blue Shield",
    payerId: "00630",
    planType: "PPO",
    groupNumber: "GRP-22019",
    lastCoverageStatus: "Active",
    lastVerifiedDate: "2026-03-01",
    lastConfidenceScore: 88,
  },
];

export async function seedSubscribers(prisma) {
  for (const subscriber of SUBSCRIBERS) {
    await prisma.subscriber.upsert({
      where: { id: subscriber.id },
      update: subscriber,
      create: subscriber,
    });
  }

  console.log(`✅ Seeded ${SUBSCRIBERS.length} subscribers`);
}
