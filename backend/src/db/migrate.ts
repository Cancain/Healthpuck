import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { db } from "./index";

async function runMigrations() {
  try {
    console.log("Running migrations...");
    migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
