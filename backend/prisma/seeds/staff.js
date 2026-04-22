/**
 * seeds/staff.js
 * Seeds legacy staff records
 */

const STAFF_RECORDS = [
  { name: "John Doe", email: "john@example.com", department: "Engineering", verified: true },
  { name: "Jane Smith", email: "jane@example.com", department: "HR", verified: false },
  { name: "Bob Johnson", email: "bob@example.com", department: "Finance", verified: true },
];

export async function seedStaff(prisma) {
  for (const record of STAFF_RECORDS) {
    await prisma.staff.upsert({
      where: { email: record.email },
      update: {},
      create: record,
    });
  }

  console.log("✅ Created legacy staff records");
}
