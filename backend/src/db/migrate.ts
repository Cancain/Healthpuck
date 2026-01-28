import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

async function runMigrations() {
  try {
    const cwd = process.cwd();
    const envPath = path.resolve(cwd, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      const parentEnvPath = path.resolve(cwd, "..", "..", ".env");
      if (fs.existsSync(parentEnvPath)) {
        dotenv.config({ path: parentEnvPath });
      } else {
        dotenv.config();
      }
    }

    const { db } = await import("./index");

    console.log("Running migrations...");
    const folder = path.resolve(__dirname, "./migrations");
    await migrate(db as any, { migrationsFolder: folder });
    console.log("Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
