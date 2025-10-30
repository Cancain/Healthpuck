import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvSafe from "dotenv-safe";

import { db } from "./index";

async function runMigrations() {
  try {
    // Load env vars the same way as in src/index.ts
    const examplePath = path.resolve(process.cwd(), "backend/.env.example");
    if (fs.existsSync(examplePath)) {
      dotenvSafe.config({
        example: examplePath,
        path: path.resolve(process.cwd(), "backend/.env"),
      });
    } else {
      // Fallback: try backend/.env then default .env
      const backendEnv = path.resolve(process.cwd(), "backend/.env");
      if (fs.existsSync(backendEnv)) {
        dotenv.config({ path: backendEnv });
      } else {
        dotenv.config();
      }
    }

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
