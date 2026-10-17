// One-time setup: creates the first Master Admin login.
// Usage (values from env, never committed):
//   MASTER_ADMIN_STAFF_ID=... MASTER_ADMIN_NAME=... MASTER_ADMIN_EMAIL=... \
//   MASTER_ADMIN_PASSWORD=... npm run create-master-admin
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const MIN_PASSWORD_LENGTH = 12;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const staffId = process.env.MASTER_ADMIN_STAFF_ID?.trim();
const name = process.env.MASTER_ADMIN_NAME?.trim();
const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.MASTER_ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
if (!staffId || !name || !email || !password) {
  fail(
    "Set MASTER_ADMIN_STAFF_ID, MASTER_ADMIN_NAME, MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD.",
  );
}
if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const existing = await client.query(
    `SELECT 1 FROM "Staff" WHERE "role" = 'MASTER_ADMIN' LIMIT 1`,
  );
  if (existing.rowCount > 0) {
    fail("A Master Admin already exists. Add other staff from inside the app.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO "Staff" ("id", "staffId", "name", "email", "role", "passwordHash", "updatedAt")
     VALUES ($1, $2, $3, $4, 'MASTER_ADMIN', $5, NOW())`,
    [randomUUID(), staffId, name, email, passwordHash],
  );
  process.stdout.write(`Master Admin created for ${email}.\n`);
} finally {
  await client.end();
}
