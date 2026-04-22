import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    seed: "node ./prisma/seeds/index.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
