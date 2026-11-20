// Rescue: gives a locked-out Master Admin a temporary password. Run it on the
// computer that holds the database:
//   npm run reset-master-admin-password -- someone@example.com
// The temporary password is generated here and printed once. At their next
// login the Master Admin must choose their own password.
import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

// No 0/O, 1/l/I, so it can be read out or copied by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

// 16 random characters in groups of four, e.g. "aB3k-9xYz-Qm7p-4tRw".
function temporaryPassword() {
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

const email = process.argv[2]?.trim().toLowerCase();
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
if (!email) fail("Give the Master Admin's email: npm run reset-master-admin-password -- someone@example.com");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rowCount: ready } = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'Staff' AND column_name = 'mustChangePassword'`,
  );
  if (ready === 0) fail("The database is out of date. Run: npx prisma migrate deploy");

  const { rows } = await client.query(
    `SELECT "id" FROM "Staff" WHERE "email" = $1 AND "role" = 'MASTER_ADMIN' AND "active" = true`,
    [email],
  );
  if (rows.length === 0) {
    fail("No active Master Admin has that email. Other staff: ask a Master Admin to reset it in the app.");
  }
  const id = rows[0].id;
  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  await client.query("BEGIN");
  await client.query(
    `UPDATE "Staff" SET "passwordHash" = $1, "mustChangePassword" = true, "updatedAt" = NOW() WHERE "id" = $2`,
    [passwordHash, id],
  );
  await client.query(
    `UPDATE "PasswordResetRequest" SET "resolvedAt" = NOW() WHERE "staffId" = $1 AND "resolvedAt" IS NULL`,
    [id],
  );
  await client.query(
    `INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "detail")
     VALUES ($1, 'STAFF_PASSWORD_RESET', 'Staff', $2, 'Reset by the rescue command')`,
    [randomUUID(), id],
  );
  await client.query("COMMIT");
  process.stdout.write(
    `Temporary password for ${email}: ${password}\n` +
      "It is shown only this once. Log in with it, then choose your own password.\n",
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
