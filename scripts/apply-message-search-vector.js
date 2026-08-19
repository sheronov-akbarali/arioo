const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const sqlFile = path.join(__dirname, "sql/message-search-vector.sql");
  const sqlContent = fs.readFileSync(sqlFile, "utf8");

  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} SQL migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql.query(stmt);
      console.log(`[${i + 1}/${statements.length}] OK`);
    } catch (err) {
      console.error(`[${i + 1}/${statements.length}] FAILED:`, err.message);
      process.exit(1);
    }
  }

  console.log("Migration complete!");
}

run();
