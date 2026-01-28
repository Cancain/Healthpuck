import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvSafe from "dotenv-safe";

async function runMigrations() {
  try {
    // Load env vars BEFORE importing db to ensure DATABASE_URL is available
    const cwd = process.cwd();
    const examplePath = path.resolve(cwd, ".env.example");
    const envPath = path.resolve(cwd, ".env");

    if (fs.existsSync(examplePath)) {
      dotenvSafe.config({
        example: examplePath,
        path: envPath,
      });
    } else if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      // Try parent directory (if running from src/db/)
      const parentEnvPath = path.resolve(cwd, "..", "..", ".env");
      const parentExamplePath = path.resolve(cwd, "..", "..", ".env.example");
      if (fs.existsSync(parentExamplePath)) {
        dotenvSafe.config({
          example: parentExamplePath,
          path: parentEnvPath,
        });
      } else if (fs.existsSync(parentEnvPath)) {
        dotenv.config({ path: parentEnvPath });
      } else {
        dotenv.config();
      }
    }

    // Import db AFTER loading env vars
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
