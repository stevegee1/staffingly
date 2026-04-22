/**
 * seeds/users.js
 * Seeds system users
 */

export async function seedUsers(prisma) {
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
}
