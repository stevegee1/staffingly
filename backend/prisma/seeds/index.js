/**
 * seeds/index.js - Main seed entry point
 * Run with: npx prisma db seed
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv/config");

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { seedPricingPackages } from "./pricingPackages.js";
import { seedUsers } from "./users.js";
import { seedClients } from "./clients.js";
import { seedPayerRules } from "./payerRules.js";
import { seedStaff } from "./staff.js";
import { seedPatients } from "./patients.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const { proPackage } = await seedPricingPackages(prisma);
  await seedUsers(prisma);
  await seedClients(prisma, { proPackage });
  await seedPayerRules(prisma);
  await seedStaff(prisma);
  await seedPatients(prisma);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
