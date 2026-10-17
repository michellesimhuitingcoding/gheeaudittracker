import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; load it for the Prisma CLI too.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
