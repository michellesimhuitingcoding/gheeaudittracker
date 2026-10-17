// Database tests run against TEST_DATABASE_URL only, never the app database.
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database to run database tests.");
}
process.env.DATABASE_URL = url;
